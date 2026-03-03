import { getMortgageRepository } from "@/lib/repositories";
import {
  generateSchedule,
  simulateSchedule,
  standardMonthlyPayment,
  calculateTopUp,
  projectScheduleFromBalance,
} from "./mortgage-calculator";
import type { MortgageParams, AmortisationRow } from "@/lib/types/mortgage.types";
import type { MortgageConfigRow, MortgageUserConfigRow, MortgagePaymentRow } from "@/lib/repositories/interfaces/mortgage.repository";
import { addMonths, format } from "date-fns";

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
    const config = await this.repo.upsertConfig({
      propertyValue: data.propertyValue,
      loanAmount: data.loanAmount,
      annualInterestRate: data.annualInterestRate,
      loanTermMonths: data.loanTermMonths,
      startDate: data.startDate,
      targetEquityUserAPct: data.targetEquityUserAPct ?? 0.5,
    });
    for (const u of data.users) {
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
        userAFinalEquityPct: scheduleResult.userAFinalEquityPct,
        userBFinalEquityPct: scheduleResult.userBFinalEquityPct,
      });
    }
    return config;
  }

  private buildParams(
    config: MortgageConfigRow,
    userConfigs: MortgageUserConfigRow[]
  ): { params: MortgageParams; userAId: number; userBId: number } {
    const sorted = [...userConfigs].sort((a, b) => b.baseSplitPct - a.baseSplitPct);
    const userA = sorted[0];
    const userB = sorted[1];
    if (!userA || !userB) {
      throw new Error("Need exactly two user configs");
    }
    const monthlyRate = config.annualInterestRate / 12;
    const params: MortgageParams = {
      loanAmount: config.loanAmount,
      monthlyRate,
      termMonths: config.loanTermMonths,
      propertyValue: config.propertyValue,
      userA: {
        deposit: userA.initialDeposit,
        baseSplitPct: userA.baseSplitPct,
        monthlyCap: userA.monthlyCap,
      },
      userB: {
        deposit: userB.initialDeposit,
        baseSplitPct: userB.baseSplitPct,
        monthlyCap: userB.monthlyCap,
      },
    };
    return { params, userAId: userA.userId, userBId: userB.userId };
  }

  async getScheduleInternal(mortgageId: number) {
    const config = await this.repo.getActiveConfig();
    if (!config || config.id !== mortgageId) return null;
    const userConfigs = await this.repo.getUserConfigs(mortgageId);
    if (userConfigs.length < 2) return null;

    const { params, userAId, userBId } = this.buildParams(config, userConfigs);
    const payments = await this.repo.getPayments(mortgageId);
    const extraByMonth = new Map<number, number>();
    for (const p of payments.filter((x) => x.isExtraPayment)) {
      extraByMonth.set(p.monthNumber, (extraByMonth.get(p.monthNumber) ?? 0) + p.amount);
    }
    const getExtraPayment = (monthNumber: number) => extraByMonth.get(monthNumber) ?? 0;
    const targetEquityUserA = config.targetEquityUserAPct ?? 0.5;

    const monthsWithPayments = [...new Set(payments.map((p) => p.monthNumber))].sort((a, b) => a - b);
    const maxPaidMonth = monthsWithPayments.length > 0 ? Math.max(...monthsWithPayments) : 0;

    for (const monthNum of monthsWithPayments) {
      await this.recalcPrincipalInterestForMonth(mortgageId, monthNum, config, payments);
    }

    if (maxPaidMonth === 0) {
      return await this.getScheduleFullProjection(
        config,
        params,
        userAId,
        userBId,
        userConfigs,
        getExtraPayment,
        targetEquityUserA
      );
    }

    const actualRows = this.buildActualRowsFromPayments(
      payments,
      config.loanAmount,
      config.startDate,
      userAId,
      userBId,
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
    };
    const M = standardMonthlyPayment(
      remainingBalance,
      params.monthlyRate,
      remainingTermMonths
    );
    const topUp = calculateTopUp(
      paramsRemaining,
      firstUnpaidDateStr,
      targetEquityUserA
    );
    const userBBase = Math.min(
      Math.round(params.userB.baseSplitPct * M),
      params.userB.monthlyCap ?? Infinity
    );
    const lastActual = actualRows[actualRows.length - 1];
    const initialUserATotal = lastActual
      ? payments
          .filter((p) => p.monthNumber <= maxPaidMonth && p.userId === userAId)
          .reduce((s, p) => s + p.amount, 0)
      : 0;
    const initialUserBTotal = lastActual
      ? payments
          .filter((p) => p.monthNumber <= maxPaidMonth && p.userId === userBId)
          .reduce((s, p) => s + p.amount, 0)
      : 0;

    const projected = projectScheduleFromBalance({
      params: paramsRemaining,
      startBalance: remainingBalance,
      startMonth: maxPaidMonth + 1,
      startDate: firstUnpaidDateStr,
      M,
      userBBase,
      topUp,
      initialUserATotal,
      initialUserBTotal,
      getExtraPayment,
      maxMonths: remainingTermMonths * 2,
    });

    const schedule: AmortisationRow[] = [...actualRows, ...projected.schedule];
    const lastRow = schedule[schedule.length - 1];
    const monthlyPaymentUserA = M - userBBase + topUp;
    const monthlyPaymentUserB = userBBase;
    const userAName = userConfigs.find((c) => c.userId === userAId)?.userName ?? "User A";
    const userBName = userConfigs.find((c) => c.userId === userBId)?.userName ?? "User B";

    return {
      monthlyBasePayment: M,
      monthlyTopUp: topUp,
      projectedMonths: projected.months,
      projectedPayoffDate: lastRow?.date ?? config.startDate,
      schedule,
      convergenceAchieved: Math.abs((lastRow?.userACumulativeEquityPct ?? 0.5) - targetEquityUserA) < 0.01,
      userAFinalEquityPct: lastRow?.userACumulativeEquityPct ?? 0.5,
      userBFinalEquityPct: lastRow?.userBCumulativeEquityPct ?? 0.5,
      monthlyPaymentUserA,
      monthlyPaymentUserB,
      targetEquityUserAPct: targetEquityUserA,
      equitySummary: {
        userA: {
          name: userAName,
          deposit: params.userA.deposit,
          totalPayments: projected.userATotalPayments,
          equityPct: lastRow?.userACumulativeEquityPct ?? 0.5,
        },
        userB: {
          name: userBName,
          deposit: params.userB.deposit,
          totalPayments: projected.userBTotalPayments,
          equityPct: lastRow?.userBCumulativeEquityPct ?? 0.5,
        },
      },
    };
  }

  private buildActualRowsFromPayments(
    payments: MortgagePaymentRow[],
    loanAmount: number,
    startDate: string,
    userAId: number,
    userBId: number,
    params: MortgageParams
  ): AmortisationRow[] {
    const byMonth = new Map<
      number,
      { totalPayment: number; principal: number; interest: number; userAPay: number; userBPay: number; date: string }
    >();
    const [startYear, startMonthNum] = startDate.slice(0, 7).split("-").map(Number);
    for (const monthNum of [...new Set(payments.map((p) => p.monthNumber))].sort((a, b) => a - b)) {
      const inMonth = payments.filter((p) => p.monthNumber === monthNum);
      const totalPayment = inMonth.reduce((s, p) => s + p.amount, 0);
      const principal = inMonth.reduce((s, p) => s + p.principalPortion, 0);
      const interest = inMonth.reduce((s, p) => s + p.interestPortion, 0);
      const userAPay = inMonth.filter((p) => p.userId === userAId).reduce((s, p) => s + p.amount, 0);
      const userBPay = inMonth.filter((p) => p.userId === userBId).reduce((s, p) => s + p.amount, 0);
      const monthStart = addMonths(new Date(startYear, startMonthNum - 1, 1), monthNum - 1);
      byMonth.set(monthNum, {
        totalPayment,
        principal,
        interest,
        userAPay,
        userBPay,
        date: format(monthStart, "yyyy-MM"),
      });
    }
    const sortedMonths = [...byMonth.keys()].sort((a, b) => a - b);
    const rows: AmortisationRow[] = [];
    let balance = loanAmount;
    let userATotal = params.userA.deposit;
    let userBTotal = params.userB.deposit;
    for (const monthNum of sortedMonths) {
      const m = byMonth.get(monthNum)!;
      const openingBalance = balance;
      balance = openingBalance - m.principal;
      userATotal += m.userAPay;
      userBTotal += m.userBPay;
      const totalContrib = userATotal + userBTotal;
      rows.push({
        month: monthNum,
        date: m.date,
        openingBalance,
        interest: m.interest,
        principal: m.principal,
        totalPayment: m.totalPayment,
        userAPayment: m.userAPay,
        userBPayment: m.userBPay,
        userACumulativeEquityPct: totalContrib > 0 ? userATotal / totalContrib : 0.5,
        userBCumulativeEquityPct: totalContrib > 0 ? userBTotal / totalContrib : 0.5,
        closingBalance: Math.max(0, Math.round(balance)),
      });
    }
    return rows;
  }

  private async getScheduleFullProjection(
    config: MortgageConfigRow,
    params: MortgageParams,
    userAId: number,
    userBId: number,
    userConfigs: MortgageUserConfigRow[],
    getExtraPayment: (monthNumber: number) => number,
    targetEquityUserA: number
  ) {
    const result = generateSchedule(params, config.startDate, targetEquityUserA);
    const M = result.monthlyBasePayment;
    const userBBase = Math.min(
      Math.round(params.userB.baseSplitPct * M),
      params.userB.monthlyCap ?? Infinity
    );
    const monthlyPaymentUserA = M - userBBase + result.monthlyTopUp;
    const monthlyPaymentUserB = userBBase;
    const withExtras = simulateSchedule(
      params,
      M,
      userBBase,
      result.monthlyTopUp,
      config.startDate,
      getExtraPayment
    );
    const userAName = userConfigs.find((c) => c.userId === userAId)?.userName ?? "User A";
    const userBName = userConfigs.find((c) => c.userId === userBId)?.userName ?? "User B";
    const lastRow = withExtras.schedule[withExtras.schedule.length - 1];
    return {
      ...result,
      schedule: withExtras.schedule,
      projectedMonths: withExtras.months,
      projectedPayoffDate: lastRow?.date ?? config.startDate,
      monthlyPaymentUserA,
      monthlyPaymentUserB,
      targetEquityUserAPct: targetEquityUserA,
      equitySummary: {
        userA: {
          name: userAName,
          deposit: params.userA.deposit,
          totalPayments: withExtras.userATotalPayments,
          equityPct: lastRow?.userACumulativeEquityPct ?? 0.5,
        },
        userB: {
          name: userBName,
          deposit: params.userB.deposit,
          totalPayments: withExtras.userBTotalPayments,
          equityPct: lastRow?.userBCumulativeEquityPct ?? 0.5,
        },
      },
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

  /**
   * Recomputes principal/interest for all payments in a given month so the schedule
   * reflects actual amounts paid. Called after recording a payment or when building actuals.
   * @param paymentsOptional - If provided (e.g. from getScheduleInternal), avoids refetching.
   */
  private async recalcPrincipalInterestForMonth(
    mortgageId: number,
    monthNumber: number,
    config: MortgageConfigRow,
    paymentsOptional?: MortgagePaymentRow[]
  ): Promise<void> {
    const payments = paymentsOptional ?? (await this.repo.getPayments(mortgageId));
    const inMonth = payments.filter((p) => p.monthNumber === monthNumber);
    if (inMonth.length === 0) return;

    const totalAmount = inMonth.reduce((s, p) => s + p.amount, 0);
    const monthlyRate = config.annualInterestRate / 12;

    const principalPaidBeforeThisMonth = payments
      .filter((p) => p.monthNumber < monthNumber)
      .reduce((s, p) => s + p.principalPortion, 0);
    const balanceAtStart = config.loanAmount - principalPaidBeforeThisMonth;

    const interestForMonth = Math.min(
      Math.round(balanceAtStart * monthlyRate),
      totalAmount
    );
    const principalForMonth = totalAmount - interestForMonth;

    let assignedPrincipal = 0;
    for (let i = 0; i < inMonth.length; i++) {
      const p = inMonth[i];
      const principalPortion =
        i === inMonth.length - 1
          ? principalForMonth - assignedPrincipal
          : Math.round(principalForMonth * (p.amount / totalAmount));
      assignedPrincipal += principalPortion;
      const interestPortion = p.amount - principalPortion;
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

    await this.recalcPrincipalInterestForMonth(config.id, monthNumber, config);
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
        userAFinalEquityPct: scheduleResult.userAFinalEquityPct,
        userBFinalEquityPct: scheduleResult.userBFinalEquityPct,
      });
    }
    return this.getSchedule();
  }
}
