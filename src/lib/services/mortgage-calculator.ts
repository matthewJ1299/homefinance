import type {
  MortgageParams,
  MortgagePerson,
  AmortisationRow,
  ScheduleResult,
} from "@/lib/types/mortgage.types";
import { primaryPerson } from "@/lib/types/mortgage.types";
import type { MortgageRateSchedule } from "@/lib/services/finance/mortgage-rate-periods";
import {
  calculateBasePaymentForMonth,
  baseForUser,
  hasRateChangeAtMonth,
  resolveMonthlyRateForMonth,
} from "@/lib/services/finance/mortgage-rate-periods";
import { addMonths, format } from "date-fns";

export function standardMonthlyPayment(
  loanAmount: number,
  monthlyRate: number,
  termMonths: number
): number {
  if (monthlyRate <= 0) return Math.ceil(loanAmount / termMonths);
  const r = monthlyRate;
  const n = termMonths;
  const M = (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(M);
}

/** Everyone except the person carrying the remainder, in the order given. */
function secondaries(people: MortgagePerson[]): MortgagePerson[] {
  const primary = primaryPerson(people);
  return people.filter((p) => p.userId !== primary.userId);
}

/** Each secondary's own share of `M`, capped. The primary takes what is left. */
function basesFor(people: MortgagePerson[], M: number): Record<number, number> {
  const out: Record<number, number> = {};
  for (const p of secondaries(people)) {
    out[p.userId] = baseForUser(M, p.baseSplitPct, p.monthlyCap);
  }
  return out;
}

function depositsTotal(people: MortgagePerson[]): number {
  return people.reduce((sum, p) => sum + p.deposit, 0);
}

function zeroTotals(people: MortgagePerson[]): Record<number, number> {
  const out: Record<number, number> = {};
  for (const p of people) out[p.userId] = 0;
  return out;
}

/**
 * Splits one month's payment across everyone.
 *
 * Secondaries take their base, in order, limited by what is left; the primary
 * takes the remainder. With two people this is exactly the old
 * `userBPay = min(base, total)` / `userAPay = total - userBPay`.
 */
function splitPayment(
  people: MortgagePerson[],
  bases: Record<number, number>,
  totalPayment: number
): Record<number, number> {
  const primary = primaryPerson(people);
  const out: Record<number, number> = {};
  let remaining = totalPayment;
  for (const p of secondaries(people)) {
    const pay = Math.min(bases[p.userId] ?? 0, remaining);
    out[p.userId] = pay;
    remaining -= pay;
  }
  out[primary.userId] = remaining;
  return out;
}

/** Share of everything put in so far, per person. Equal shares before anything is paid. */
function equityShares(
  people: MortgagePerson[],
  totals: Record<number, number>
): Record<number, number> {
  const totalContrib =
    depositsTotal(people) + people.reduce((sum, p) => sum + (totals[p.userId] ?? 0), 0);
  const out: Record<number, number> = {};
  for (const p of people) {
    out[p.userId] =
      totalContrib > 0 ? (p.deposit + (totals[p.userId] ?? 0)) / totalContrib : 1 / people.length;
  }
  return out;
}

/** The primary's share, which is what the top-up solves for. */
function primaryEquity(people: MortgagePerson[], totals: Record<number, number>): number {
  return equityShares(people, totals)[primaryPerson(people).userId];
}

interface SimulationResult {
  totalPaymentsByUserId: Record<number, number>;
  schedule: AmortisationRow[];
  months: number;
}

export function simulateSchedule(
  params: MortgageParams,
  M: number,
  bases: Record<number, number>,
  topUp: number,
  startDate: string,
  getExtraPayment?: (monthNumber: number) => number,
  rateSchedule?: MortgageRateSchedule
): SimulationResult {
  const people = params.people;
  let balance = params.loanAmount;
  const totals = zeroTotals(people);
  const schedule: AmortisationRow[] = [];
  let month = 0;
  let currentM = M;
  let currentBases = bases;
  const totalTermMonths = params.termMonths;
  const [startYear, startMonth] = startDate.slice(0, 7).split("-").map(Number);
  let currentDate = new Date(startYear, startMonth - 1, 1);

  while (balance > 0.5) {
    month++;
    const openingBalance = balance;
    const monthlyRate = rateSchedule
      ? resolveMonthlyRateForMonth(month, rateSchedule)
      : params.monthlyRate;

    if (rateSchedule && (month === 1 || hasRateChangeAtMonth(month, rateSchedule))) {
      currentM = calculateBasePaymentForMonth({
        monthNumber: month,
        openingBalance,
        totalTermMonths,
        rateSchedule,
      });
      currentBases = basesFor(people, currentM);
    }

    const interest = Math.round(openingBalance * monthlyRate);

    const extra = getExtraPayment ? getExtraPayment(month) : 0;
    let totalPayment = currentM + topUp + extra;
    if (totalPayment > balance + interest) {
      totalPayment = balance + interest;
    }

    const paymentByUserId = splitPayment(people, currentBases, totalPayment);

    const principal = totalPayment - interest;
    balance = openingBalance - principal;

    for (const p of people) totals[p.userId] += paymentByUserId[p.userId] ?? 0;

    schedule.push({
      month,
      date: format(currentDate, "yyyy-MM"),
      openingBalance,
      interest,
      principal,
      totalPayment,
      paymentByUserId,
      equityPctByUserId: equityShares(people, totals),
      closingBalance: Math.max(0, Math.round(balance)),
    });

    currentDate = addMonths(currentDate, 1);
    if (month > params.termMonths * 2) break;
  }

  return { totalPaymentsByUserId: totals, schedule, months: month };
}

export function calculateTopUp(
  params: MortgageParams,
  startDate: string,
  targetEquityPrimary: number = 0.5,
  rateSchedule?: MortgageRateSchedule
): number {
  const M = standardMonthlyPayment(
    params.loanAmount,
    rateSchedule ? resolveMonthlyRateForMonth(1, rateSchedule) : params.monthlyRate,
    params.termMonths
  );
  const bases = basesFor(params.people, M);

  const resultAtZero = simulateSchedule(params, M, bases, 0, startDate, undefined, rateSchedule);
  if (
    primaryEquity(params.people, resultAtZero.totalPaymentsByUserId) >=
    targetEquityPrimary - 0.001
  ) {
    return 0;
  }

  let lo = 0;
  let hi = M * 5;

  for (let i = 0; i < 100; i++) {
    const T = Math.round((lo + hi) / 2);
    const result = simulateSchedule(params, M, bases, T, startDate, undefined, rateSchedule);
    if (primaryEquity(params.people, result.totalPaymentsByUserId) < targetEquityPrimary) {
      lo = T;
    } else {
      hi = T;
    }
    if (hi - lo <= 1) break;
  }

  return Math.round((lo + hi) / 2);
}

export function generateSchedule(
  params: MortgageParams,
  startDate: string,
  targetEquityPrimary: number = 0.5,
  rateSchedule?: MortgageRateSchedule
): ScheduleResult {
  const M = rateSchedule
    ? calculateBasePaymentForMonth({
        monthNumber: 1,
        openingBalance: params.loanAmount,
        totalTermMonths: params.termMonths,
        rateSchedule,
      })
    : standardMonthlyPayment(params.loanAmount, params.monthlyRate, params.termMonths);
  const bases = basesFor(params.people, M);
  const topUp = calculateTopUp(params, startDate, targetEquityPrimary, rateSchedule);
  const result = simulateSchedule(params, M, bases, topUp, startDate, undefined, rateSchedule);

  const finalEquity = equityShares(params.people, result.totalPaymentsByUserId);
  const primaryFinal = finalEquity[primaryPerson(params.people).userId];

  const lastRow = result.schedule[result.schedule.length - 1];
  const payoffDate = lastRow ? lastRow.date : startDate;

  return {
    monthlyBasePayment: M,
    monthlyTopUp: topUp,
    projectedMonths: result.months,
    projectedPayoffDate: payoffDate,
    schedule: result.schedule,
    convergenceAchieved: Math.abs(primaryFinal - targetEquityPrimary) < 0.01,
    finalEquityPctByUserId: finalEquity,
    currentBalance: params.loanAmount,
  };
}

export function checkConvergenceFeasibility(
  params: MortgageParams,
  startDate: string
): { feasible: boolean; bestAchievablePct: number } {
  const M = standardMonthlyPayment(params.loanAmount, params.monthlyRate, params.termMonths);
  // Every secondary's base at zero: the primary pays everything, which is the
  // most equity they can possibly reach.
  const result = simulateSchedule(params, M, {}, M * 3, startDate);
  const bestPct = primaryEquity(params.people, result.totalPaymentsByUserId);
  return { feasible: bestPct >= 0.5, bestAchievablePct: bestPct };
}

export interface ProjectFromBalanceOptions {
  params: MortgageParams;
  startBalance: number;
  startMonth: number;
  startDate: string;
  M: number;
  bases: Record<number, number>;
  topUp: number;
  /** Payments already made, per person, before `startMonth`. */
  initialTotals: Record<number, number>;
  getExtraPayment?: (monthNumber: number) => number;
  maxMonths?: number;
  /** Original loan term; required when rateSchedule is set. */
  totalTermMonths?: number;
  rateSchedule?: MortgageRateSchedule;
}

/**
 * Projects the amortisation schedule from a given balance and month onward.
 * Used when past months are taken from actual payments; only future months are simulated.
 */
export function projectScheduleFromBalance(options: ProjectFromBalanceOptions): {
  schedule: AmortisationRow[];
  totalPaymentsByUserId: Record<number, number>;
  months: number;
} {
  const {
    params,
    startBalance,
    startMonth,
    startDate,
    M,
    bases,
    topUp,
    initialTotals,
    getExtraPayment,
    maxMonths = params.termMonths * 2,
    totalTermMonths = params.termMonths,
    rateSchedule,
  } = options;

  const people = params.people;
  let balance = startBalance;
  const totals = { ...zeroTotals(people), ...initialTotals };
  const schedule: AmortisationRow[] = [];
  let currentM = M;
  let currentBases = bases;
  const [startYear, startMonthNum] = startDate.slice(0, 7).split("-").map(Number);
  let currentDate = new Date(startYear, startMonthNum - 1, 1);
  currentDate = addMonths(currentDate, startMonth - 1);
  let month = startMonth - 1;
  const maxMonth = startMonth + maxMonths;

  while (balance > 0.5 && month < maxMonth) {
    month++;
    const openingBalance = balance;
    const monthlyRate = rateSchedule
      ? resolveMonthlyRateForMonth(month, rateSchedule)
      : params.monthlyRate;

    if (rateSchedule && (month === startMonth || hasRateChangeAtMonth(month, rateSchedule))) {
      currentM = calculateBasePaymentForMonth({
        monthNumber: month,
        openingBalance,
        totalTermMonths,
        rateSchedule,
      });
      currentBases = basesFor(people, currentM);
    }

    const interest = Math.round(openingBalance * monthlyRate);

    const extra = getExtraPayment ? getExtraPayment(month) : 0;
    let totalPayment = currentM + topUp + extra;
    if (totalPayment > balance + interest) {
      totalPayment = balance + interest;
    }

    const paymentByUserId = splitPayment(people, currentBases, totalPayment);

    const principal = totalPayment - interest;
    balance = openingBalance - principal;

    for (const p of people) totals[p.userId] += paymentByUserId[p.userId] ?? 0;

    schedule.push({
      month,
      date: format(currentDate, "yyyy-MM"),
      openingBalance,
      interest,
      principal,
      totalPayment,
      paymentByUserId,
      equityPctByUserId: equityShares(people, totals),
      closingBalance: Math.max(0, Math.round(balance)),
    });

    currentDate = addMonths(currentDate, 1);
  }

  return { schedule, totalPaymentsByUserId: totals, months: month };
}
