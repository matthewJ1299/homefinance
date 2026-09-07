import { getMortgageRepository } from "@/lib/repositories";
import { solveMortgageShares } from "./finance/mortgage-plan";
import {
  allocateMonthPrincipalInterest,
  generateSchedule,
  simulateSchedule,
  calculateTopUp,
  projectScheduleFromBalance,
  standardMonthlyPayment,
} from "./finance/mortgage";
import {
  calculateBasePaymentForMonth,
  baseForUser,
  resolveAnnualRateForMonth,
  resolveMonthlyRateForMonth,
  type MortgageRateSchedule,
} from "./finance/mortgage-rate-periods";
import type { MortgageRatePeriodRow } from "@/lib/repositories/interfaces/mortgage.repository";
import type { MortgageParams, AmortisationRow, MortgagePerson } from "@/lib/types/mortgage.types";
import { primaryPerson } from "@/lib/types/mortgage.types";
import type { MortgageConfigRow, MortgageUserConfigRow, MortgagePaymentRow } from "@/lib/repositories/interfaces/mortgage.repository";
import { addMonths, format } from "date-fns";

/**
 * The snapshot table keeps two equity columns, from when a bond was two people.
 * The primary goes in A and the next-largest in B; with more than two on the
 * bond the snapshot is a summary, and `equitySummary.people` is the full record.
 */
function snapshotEquityPair(
  people: Array<{ equityPct: number }>
): { userAFinalEquityPct: number; userBFinalEquityPct: number } {
  return {
    userAFinalEquityPct: people[0]?.equityPct ?? 1,
    userBFinalEquityPct: people[1]?.equityPct ?? 0,
  };
}

/**
 * The monthly split each person should carry, solved rather than typed.
 *
 * `solveMortgageShares` is what the setup form previews. Storing the typed
 * percentages instead meant the preview and the saved plan could disagree
 * immediately. When the target is not reachable the solver says so, and the
 * submitted percentages stand -- the screen already reports the blockers.
 */
function solvedUserSplits(data: {
  propertyValue: number;
  loanAmount: number;
  annualInterestRate: number;
  loanTermMonths: number;
  targetEquityUserAPct?: number | null;
  users: Array<{
    userId: number;
    initialDeposit: number;
    baseSplitPct: number;
    monthlyCap?: number;
  }>;
}): Array<{ userId: number; initialDeposit: number; baseSplitPct: number; monthlyCap?: number }> {
  if (data.users.length < 2) return data.users;
  const paymentMinor = standardMonthlyPayment(
    data.loanAmount,
    data.annualInterestRate / 12,
    data.loanTermMonths
  );
  if (paymentMinor <= 0) return data.users;

  // The target names the primary's share; everyone else divides the rest in
  // proportion to what they were asked to carry.
  const primaryShareBp = Math.round((data.targetEquityUserAPct ?? 0.5) * 10_000);
  const [primary, ...rest] = data.users;
  const restWeight = rest.reduce((sum, u) => sum + Math.max(0, u.baseSplitPct), 0);
  const targets = [
    { userId: primary.userId, shareBp: primaryShareBp },
    ...rest.map((u) => ({
      userId: u.userId,
      shareBp:
        restWeight > 0
          ? Math.round(((10_000 - primaryShareBp) * Math.max(0, u.baseSplitPct)) / restWeight)
          : Math.round((10_000 - primaryShareBp) / Math.max(1, rest.length)),
    })),
  ];

  const solved = solveMortgageShares({
    price: data.propertyValue,
    paymentMinor,
    termMonths: data.loanTermMonths,
    annualRateBp: Math.round(data.annualInterestRate * 10_000),
    deposits: data.users.map((u) => ({ userId: u.userId, amountMinor: u.initialDeposit })),
    targets,
  });
  if (!solved.reachable) return data.users;

  const totalMonthly = solved.shares.reduce((sum, sh) => sum + sh.monthlyMinor, 0);
  if (totalMonthly <= 0) return data.users;
  return data.users.map((u) => {
    const share = solved.shares.find((sh) => sh.userId === u.userId);
    return share ? { ...u, baseSplitPct: share.monthlyMinor / totalMonthly } : u;
  });
}

/** Each non-primary person's own capped share of a month's payment. */
function basesForPeople(people: MortgagePerson[], M: number): Record<number, number> {
  const primaryId = primaryPerson(people).userId;
  const out: Record<number, number> = {};
  for (const p of people) {
    if (p.userId === primaryId) continue;
    out[p.userId] = baseForUser(M, p.baseSplitPct, p.monthlyCap);
  }
  return out;
}

export class MortgageService {
  constructor(private repo = getMortgageRepository()) {}

  async getConfig() {
    const config = await this.repo.getActiveConfig();
    if (!config) {
      return { config: null, userConfigs: [] };
    }
    const userConfigs = await this.repo.getUserConfigs(config.id);
    return { config, userConfigs };
  }

  async saveConfig(data: {
    propertyValue: number;
    loanAmount: number;
    annualInterestRate: number;
    loanTermMonths: number;
    startDate: string;
    targetEquityUserAPct?: number | null;
    users: Array<{
      userId: number;
      initialDeposit: number;
      baseSplitPct: number;
      monthlyCap?: number;
    }>;
  }) {
    const existing = await this.repo.getActiveConfig();
    // One solver, one answer. The setup form previews `solveMortgageShares`
    // but used to submit whatever percentages were typed into the split boxes,
    // so the plan on screen and the plan in the database could disagree from
    // the moment it was saved. Solve here and store that.
    const users = solvedUserSplits(data);
    const config = await this.repo.upsertConfig({
      propertyValue: data.propertyValue,
      loanAmount: data.loanAmount,
      annualInterestRate: data.annualInterestRate,
      loanTermMonths: data.loanTermMonths,
      startDate: data.startDate,
      targetEquityUserAPct: data.targetEquityUserAPct ?? 0.5,
    });
    for (const u of users) {
      await this.repo.upsertUserConfig(config.id, u.userId, {
        initialDeposit: u.initialDeposit,
        baseSplitPct: u.baseSplitPct,
        monthlyCap: u.monthlyCap ?? null,
      });
    }
    const scheduleResult = await this.getScheduleInternal(config.id);
    if (scheduleResult) {
      await this.repo.saveSnapshot({
        mortgageId: config.id,
        triggerEvent: existing ? "config_update" : "initial",
        scheduleJson: JSON.stringify(scheduleResult.schedule),
        projectedPayoffDate: scheduleResult.projectedPayoffDate,
        projectedMonths: scheduleResult.projectedMonths,
        monthlyTopup: scheduleResult.monthlyTopUp,
        ...snapshotEquityPair(scheduleResult.equitySummary.people),
      });
    }
    return config;
  }

  /**
   * Everyone on the bond, as the engine wants them.
   *
   * This used to sort by `baseSplitPct`, take the first two and throw the rest
   * away -- so a third person on the bond simply did not exist to the schedule.
   */
  private buildParams(
    config: MortgageConfigRow,
    userConfigs: MortgageUserConfigRow[]
  ): { params: MortgageParams; primaryUserId: number } {
    if (userConfigs.length === 0) {
      throw new Error("A mortgage needs at least one person");
    }
    const params: MortgageParams = {
      loanAmount: config.loanAmount,
      monthlyRate: config.annualInterestRate / 12,
      termMonths: config.loanTermMonths,
      propertyValue: config.propertyValue,
      people: userConfigs.map((c) => ({
        userId: c.userId,
        deposit: c.initialDeposit,
        baseSplitPct: c.baseSplitPct,
        monthlyCap: c.monthlyCap,
      })),
    };
    return { params, primaryUserId: primaryPerson(params.people).userId };
  }

  /** Names for the schedule's people, in the order the params list them. */
  private namesFor(
    params: MortgageParams,
    userConfigs: MortgageUserConfigRow[]
  ): Map<number, string> {
    return new Map(
      params.people.map((p) => [
        p.userId,
        userConfigs.find((c) => c.userId === p.userId)?.userName ?? "Someone",
      ])
    );
  }

  private equitySummaryFor(
    params: MortgageParams,
    userConfigs: MortgageUserConfigRow[],
    totals: Record<number, number>,
    equityPct: Record<number, number>
  ) {
    const names = this.namesFor(params, userConfigs);
    const evenShare = 1 / params.people.length;
    // Primary first: they carry the remainder, and the two-column snapshot
    // below reads index 0 as the person the target equity is solved for.
    const primaryId = primaryPerson(params.people).userId;
    const ordered = [...params.people].sort(
      (a, b) => Number(b.userId === primaryId) - Number(a.userId === primaryId)
    );
    return {
      people: ordered.map((p) => ({
        userId: p.userId,
        name: names.get(p.userId) ?? "Someone",
        deposit: p.deposit,
        totalPayments: totals[p.userId] ?? 0,
        equityPct: equityPct[p.userId] ?? evenShare,
      })),
    };
  }

  async getScheduleInternal(mortgageId: number) {
    const config = await this.repo.getActiveConfig();
    if (!config || config.id !== mortgageId) return null;
    const userConfigs = await this.repo.getUserConfigs(mortgageId);
    // One person on the bond is a schedule that is simply theirs. The old
    // "need exactly two" check turned that into no mortgage at all.
    if (userConfigs.length === 0) return null;

    const { params, primaryUserId } = this.buildParams(config, userConfigs);
    const ratePeriodRows = await this.repo.getRatePeriods(mortgageId);
    const rateSchedule = this.buildRateSchedule(config, ratePeriodRows);
    const payments = await this.repo.getPayments(mortgageId);
    const extraByMonth = new Map<number, number>();
    for (const p of payments.filter((x) => x.isExtraPayment)) {
      extraByMonth.set(p.monthNumber, (extraByMonth.get(p.monthNumber) ?? 0) + p.amount);
    }
    const getExtraPayment = (monthNumber: number) => extraByMonth.get(monthNumber) ?? 0;
    const targetEquityPrimary = config.targetEquityUserAPct ?? 0.5;

    const monthsWithPayments = [...new Set(payments.map((p) => p.monthNumber))].sort((a, b) => a - b);
    const maxPaidMonth = monthsWithPayments.length > 0 ? Math.max(...monthsWithPayments) : 0;

    for (const monthNum of monthsWithPayments) {
      await this.recalcPrincipalInterestForMonth(
        mortgageId,
        monthNum,
        config,
        rateSchedule,
        payments
      );
    }

    if (maxPaidMonth === 0) {
      return await this.getScheduleFullProjection(
        config,
        params,
        primaryUserId,
        userConfigs,
        getExtraPayment,
        targetEquityPrimary,
        rateSchedule
      );
    }

    const actualRows = this.buildActualRowsFromPayments(
      payments,
      config.loanAmount,
      config.startDate,
      params
    );
    const totalPrincipalPaid = payments.reduce((s, p) => s + p.principalPortion, 0);
    const remainingBalance = config.loanAmount - totalPrincipalPaid;

    const [startYear, startMonthNum] = config.startDate.slice(0, 7).split("-").map(Number);
    const firstUnpaidDate = addMonths(
      new Date(startYear, startMonthNum - 1, 1),
      maxPaidMonth
    );
    const firstUnpaidDateStr = format(firstUnpaidDate, "yyyy-MM");
    const remainingTermMonths = Math.max(1, config.loanTermMonths - maxPaidMonth);
    const paramsRemaining: MortgageParams = {
      ...params,
      loanAmount: remainingBalance,
      termMonths: remainingTermMonths,
      monthlyRate: resolveMonthlyRateForMonth(maxPaidMonth + 1, rateSchedule),
    };
    const upcomingMonth = maxPaidMonth + 1;
    const M = calculateBasePaymentForMonth({
      monthNumber: upcomingMonth,
      openingBalance: remainingBalance,
      totalTermMonths: config.loanTermMonths,
      rateSchedule,
    });
    const topUp = calculateTopUp(
      paramsRemaining,
      firstUnpaidDateStr,
      targetEquityPrimary,
      rateSchedule
    );
    const bases = basesForPeople(params.people, M);
    const lastActual = actualRows[actualRows.length - 1];
    const initialTotals: Record<number, number> = {};
    for (const person of params.people) {
      initialTotals[person.userId] = lastActual
        ? payments
            .filter((p) => p.monthNumber <= maxPaidMonth && p.userId === person.userId)
            .reduce((s, p) => s + p.amount, 0)
        : 0;
    }

    const projected = projectScheduleFromBalance({
      params: paramsRemaining,
      startBalance: remainingBalance,
      startMonth: maxPaidMonth + 1,
      startDate: firstUnpaidDateStr,
      M,
      bases,
      topUp,
      initialTotals,
      getExtraPayment,
      maxMonths: remainingTermMonths * 2,
      totalTermMonths: config.loanTermMonths,
      rateSchedule,
    });

    const schedule: AmortisationRow[] = [...actualRows, ...projected.schedule];
    const lastRow = schedule[schedule.length - 1];
    // The primary covers whatever the others' bases leave, plus the top-up.
    const monthlyPaymentByUserId: Record<number, number> = { ...bases };
    monthlyPaymentByUserId[primaryUserId] =
      M - Object.values(bases).reduce((s, b) => s + b, 0) + topUp;

    const evenShare = 1 / params.people.length;
    const finalEquity = lastRow?.equityPctByUserId ?? {};
    const primaryFinal = finalEquity[primaryUserId] ?? evenShare;

    const currentBalance =
      actualRows.length > 0 ? actualRows[actualRows.length - 1].closingBalance : config.loanAmount;
    const upcomingAnnualRate = resolveAnnualRateForMonth(upcomingMonth, rateSchedule);
    return {
      monthlyBasePayment: M,
      monthlyTopUp: topUp,
      projectedMonths: projected.months,
      projectedPayoffDate: lastRow?.date ?? config.startDate,
      schedule,
      convergenceAchieved: Math.abs(primaryFinal - targetEquityPrimary) < 0.01,
      finalEquityPctByUserId: finalEquity,
      currentBalance,
      monthlyPaymentByUserId,
      primaryUserId,
      upcomingAnnualRate,
      upcomingMonthNumber: upcomingMonth,
      targetEquityPrimaryPct: targetEquityPrimary,
      equitySummary: this.equitySummaryFor(
        params,
        userConfigs,
        projected.totalPaymentsByUserId,
        finalEquity
      ),
    };
  }

  private buildActualRowsFromPayments(
    payments: MortgagePaymentRow[],
    loanAmount: number,
    startDate: string,
    params: MortgageParams
  ): AmortisationRow[] {
    const people = params.people;
    const byMonth = new Map<
      number,
      {
        totalPayment: number;
        principal: number;
        interest: number;
        paidByUserId: Record<number, number>;
        date: string;
      }
    >();
    const [startYear, startMonthNum] = startDate.slice(0, 7).split("-").map(Number);
    for (const monthNum of [...new Set(payments.map((p) => p.monthNumber))].sort((a, b) => a - b)) {
      const inMonth = payments.filter((p) => p.monthNumber === monthNum);
      const paidByUserId: Record<number, number> = {};
      for (const person of people) {
        paidByUserId[person.userId] = inMonth
          .filter((p) => p.userId === person.userId)
          .reduce((s, p) => s + p.amount, 0);
      }
      const monthStart = addMonths(new Date(startYear, startMonthNum - 1, 1), monthNum - 1);
      byMonth.set(monthNum, {
        totalPayment: inMonth.reduce((s, p) => s + p.amount, 0),
        principal: inMonth.reduce((s, p) => s + p.principalPortion, 0),
        interest: inMonth.reduce((s, p) => s + p.interestPortion, 0),
        paidByUserId,
        date: format(monthStart, "yyyy-MM"),
      });
    }
    const sortedMonths = [...byMonth.keys()].sort((a, b) => a - b);
    const rows: AmortisationRow[] = [];
    let balance = loanAmount;
    const running: Record<number, number> = {};
    for (const person of people) running[person.userId] = person.deposit;
    const evenShare = 1 / people.length;

    for (const monthNum of sortedMonths) {
      const m = byMonth.get(monthNum)!;
      const openingBalance = balance;
      balance = openingBalance - m.principal;
      for (const person of people) running[person.userId] += m.paidByUserId[person.userId] ?? 0;
      const totalContrib = people.reduce((s, person) => s + running[person.userId], 0);
      const equityPctByUserId: Record<number, number> = {};
      for (const person of people) {
        equityPctByUserId[person.userId] =
          totalContrib > 0 ? running[person.userId] / totalContrib : evenShare;
      }
      rows.push({
        month: monthNum,
        date: m.date,
        openingBalance,
        interest: m.interest,
        principal: m.principal,
        totalPayment: m.totalPayment,
        paymentByUserId: m.paidByUserId,
        equityPctByUserId,
        closingBalance: Math.max(0, Math.round(balance)),
      });
    }
    return rows;
  }

  private async getScheduleFullProjection(
    config: MortgageConfigRow,
    params: MortgageParams,
    primaryUserId: number,
    userConfigs: MortgageUserConfigRow[],
    getExtraPayment: (monthNumber: number) => number,
    targetEquityPrimary: number,
    rateSchedule: MortgageRateSchedule
  ) {
    const result = generateSchedule(params, config.startDate, targetEquityPrimary, rateSchedule);
    const M = result.monthlyBasePayment;
    const bases = basesForPeople(params.people, M);
    const monthlyPaymentByUserId: Record<number, number> = { ...bases };
    monthlyPaymentByUserId[primaryUserId] =
      M - Object.values(bases).reduce((s, b) => s + b, 0) + result.monthlyTopUp;

    const withExtras = simulateSchedule(
      params,
      M,
      bases,
      result.monthlyTopUp,
      config.startDate,
      getExtraPayment,
      rateSchedule
    );
    const lastRow = withExtras.schedule[withExtras.schedule.length - 1];
    const evenShare = 1 / params.people.length;
    const finalEquity = lastRow?.equityPctByUserId ?? result.finalEquityPctByUserId;
    return {
      ...result,
      schedule: withExtras.schedule,
      projectedMonths: withExtras.months,
      projectedPayoffDate: lastRow?.date ?? config.startDate,
      currentBalance: config.loanAmount,
      finalEquityPctByUserId: finalEquity,
      monthlyPaymentByUserId,
      primaryUserId,
      upcomingAnnualRate: resolveAnnualRateForMonth(1, rateSchedule),
      upcomingMonthNumber: 1,
      targetEquityPrimaryPct: targetEquityPrimary,
      convergenceAchieved:
        Math.abs((finalEquity[primaryUserId] ?? evenShare) - targetEquityPrimary) < 0.01,
      equitySummary: this.equitySummaryFor(
        params,
        userConfigs,
        withExtras.totalPaymentsByUserId,
        finalEquity
      ),
    };
  }

  async getSchedule() {
    const config = await this.repo.getActiveConfig();
    if (!config) return null;
    return this.getScheduleInternal(config.id);
  }

  async getPayments(mortgageId: number) {
    return this.repo.getPayments(mortgageId);
  }

  async getRatePeriods(mortgageId: number): Promise<MortgageRatePeriodRow[]> {
    return this.repo.getRatePeriods(mortgageId);
  }

  async saveRatePeriods(
    periods: Array<{ effectiveFromMonth: number; annualInterestRate: number }>
  ) {
    const config = await this.repo.getActiveConfig();
    if (!config) {
      throw new Error("No mortgage configured");
    }

    const normalized = periods.map((period) => ({
      effectiveFromMonth: period.effectiveFromMonth,
      annualInterestRate:
        period.annualInterestRate > 1
          ? period.annualInterestRate / 100
          : period.annualInterestRate,
    }));

    await this.repo.replaceRatePeriods(config.id, normalized);

    const scheduleResult = await this.getScheduleInternal(config.id);
    if (scheduleResult) {
      await this.repo.saveSnapshot({
        mortgageId: config.id,
        triggerEvent: "rate_periods_update",
        scheduleJson: JSON.stringify(scheduleResult.schedule),
        projectedPayoffDate: scheduleResult.projectedPayoffDate,
        projectedMonths: scheduleResult.projectedMonths,
        monthlyTopup: scheduleResult.monthlyTopUp,
        ...snapshotEquityPair(scheduleResult.equitySummary.people),
      });
    }

    return normalized;
  }

  private buildRateSchedule(
    config: MortgageConfigRow,
    periodRows: MortgageRatePeriodRow[]
  ): MortgageRateSchedule {
    return {
      defaultAnnualRate: config.annualInterestRate,
      periods: periodRows.map((period) => ({
        effectiveFromMonth: period.effectiveFromMonth,
        annualInterestRate: period.annualInterestRate,
      })),
    };
  }

  /**
   * Recomputes principal/interest for all payments in a given month so the schedule
   * reflects actual amounts paid. Called after recording a payment or when building actuals.
   * @param paymentsOptional - If provided (e.g. from getScheduleInternal), avoids refetching.
   */
  private async recalcPrincipalInterestForMonth(
    mortgageId: number,
    monthNumber: number,
    config: MortgageConfigRow,
    rateSchedule: MortgageRateSchedule,
    paymentsOptional?: MortgagePaymentRow[]
  ): Promise<void> {
    const payments = paymentsOptional ?? (await this.repo.getPayments(mortgageId));
    const inMonth = payments.filter((p) => p.monthNumber === monthNumber);
    if (inMonth.length === 0) return;

    const monthlyRate = resolveMonthlyRateForMonth(monthNumber, rateSchedule);

    const principalPaidBeforeThisMonth = payments
      .filter((p) => p.monthNumber < monthNumber)
      .reduce((s, p) => s + p.principalPortion, 0);
    const balanceAtStart = config.loanAmount - principalPaidBeforeThisMonth;

    const allocations = allocateMonthPrincipalInterest({
      balanceAtMonthStart: balanceAtStart,
      monthlyRate,
      paymentsInMonth: inMonth,
    });

    for (let i = 0; i < inMonth.length; i++) {
      const p = inMonth[i]!;
      const { principalPortion, interestPortion } = allocations[i]!;
      p.principalPortion = principalPortion;
      p.interestPortion = interestPortion;
      await this.repo.updatePaymentPrincipalInterest(
        p.id,
        principalPortion,
        interestPortion
      );
    }
  }

  /** Record a regular mortgage payment (e.g. from an expense with Mortgage category). */
  async recordPaymentFromExpense(
    userId: number,
    amount: number,
    paymentDate: string,
    note?: string | null
  ): Promise<boolean> {
    const config = await this.repo.getActiveConfig();
    if (!config) return false;

    const [y, m] = config.startDate.slice(0, 7).split("-").map(Number);
    const paymentD = new Date(paymentDate + "T12:00:00");
    const startD = new Date(y, m - 1, 1);
    const monthNumber = Math.max(
      1,
      (paymentD.getFullYear() - startD.getFullYear()) * 12 +
        (paymentD.getMonth() - startD.getMonth()) +
        1
    );

    await this.repo.insertPayment({
      mortgageId: config.id,
      userId,
      paymentDate,
      monthNumber,
      amount,
      principalPortion: amount,
      interestPortion: 0,
      isExtraPayment: false,
      note,
    });

    const ratePeriodRows = await this.repo.getRatePeriods(config.id);
    const rateSchedule = this.buildRateSchedule(config, ratePeriodRows);
    await this.recalcPrincipalInterestForMonth(
      config.id,
      monthNumber,
      config,
      rateSchedule
    );
    return true;
  }

  async recordExtraPayment(
    userId: number,
    amount: number,
    paymentDate: string,
    note?: string | null
  ) {
    const config = await this.repo.getActiveConfig();
    if (!config) return null;

    const startDate = config.startDate;
    const [y, m] = startDate.slice(0, 7).split("-").map(Number);
    const paymentD = new Date(paymentDate + "T12:00:00");
    const startD = new Date(y, m - 1, 1);
    const monthNumber = Math.max(
      1,
      (paymentD.getFullYear() - startD.getFullYear()) * 12 +
        (paymentD.getMonth() - startD.getMonth()) +
        1
    );

    const id = await this.repo.insertPayment({
      mortgageId: config.id,
      userId,
      paymentDate,
      monthNumber,
      amount,
      principalPortion: amount,
      interestPortion: 0,
      isExtraPayment: true,
      note,
    });

    const scheduleResult = await this.getScheduleInternal(config.id);
    if (scheduleResult) {
      await this.repo.saveSnapshot({
        mortgageId: config.id,
        triggerEvent: "extra_payment",
        triggerPaymentId: id,
        scheduleJson: JSON.stringify(scheduleResult.schedule),
        projectedPayoffDate: scheduleResult.projectedPayoffDate,
        projectedMonths: scheduleResult.projectedMonths,
        monthlyTopup: scheduleResult.monthlyTopUp,
        ...snapshotEquityPair(scheduleResult.equitySummary.people),
      });
    }
    return this.getSchedule();
  }
}
