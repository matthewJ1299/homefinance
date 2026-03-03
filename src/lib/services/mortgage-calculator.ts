import type { MortgageParams, AmortisationRow, ScheduleResult } from "@/lib/types/mortgage.types";
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

interface SimulationResult {
  userATotalPayments: number;
  userBTotalPayments: number;
  schedule: AmortisationRow[];
  months: number;
}

export function simulateSchedule(
  params: MortgageParams,
  M: number,
  userBBase: number,
  topUp: number,
  startDate: string,
  getExtraPayment?: (monthNumber: number) => number
): SimulationResult {
  let balance = params.loanAmount;
  let userATotalPayments = 0;
  let userBTotalPayments = 0;
  const schedule: AmortisationRow[] = [];
  let month = 0;
  const [startYear, startMonth] = startDate.slice(0, 7).split("-").map(Number);
  let currentDate = new Date(startYear, startMonth - 1, 1);

  while (balance > 0.5) {
    month++;
    const openingBalance = balance;
    const interest = Math.round(balance * params.monthlyRate);

    const extra = getExtraPayment ? getExtraPayment(month) : 0;
    let totalPayment = M + topUp + extra;
    if (totalPayment > balance + interest) {
      totalPayment = balance + interest;
    }

    let userBPay = Math.min(userBBase, totalPayment);
    const userAPay = totalPayment - userBPay;

    const principal = totalPayment - interest;
    balance = openingBalance - principal;

    userATotalPayments += userAPay;
    userBTotalPayments += userBPay;

    const totalContrib =
      params.userA.deposit +
      params.userB.deposit +
      userATotalPayments +
      userBTotalPayments;

    schedule.push({
      month,
      date: format(currentDate, "yyyy-MM"),
      openingBalance,
      interest,
      principal,
      totalPayment,
      userAPayment: userAPay,
      userBPayment: userBPay,
      userACumulativeEquityPct:
        totalContrib > 0
          ? (params.userA.deposit + userATotalPayments) / totalContrib
          : 0.5,
      userBCumulativeEquityPct:
        totalContrib > 0
          ? (params.userB.deposit + userBTotalPayments) / totalContrib
          : 0.5,
      closingBalance: Math.max(0, Math.round(balance)),
    });

    currentDate = addMonths(currentDate, 1);
    if (month > params.termMonths * 2) break;
  }

  return {
    userATotalPayments,
    userBTotalPayments,
    schedule,
    months: month,
  };
}

export function calculateTopUp(
  params: MortgageParams,
  startDate: string,
  targetEquityUserA: number = 0.5
): number {
  const M = standardMonthlyPayment(
    params.loanAmount,
    params.monthlyRate,
    params.termMonths
  );
  const userBBase = Math.min(
    Math.round(params.userB.baseSplitPct * M),
    params.userB.monthlyCap ?? Infinity
  );

  const resultAtZero = simulateSchedule(params, M, userBBase, 0, startDate);
  const totalContribZero =
    params.userA.deposit +
    params.userB.deposit +
    resultAtZero.userATotalPayments +
    resultAtZero.userBTotalPayments;
  const userAEquityAtZero =
    totalContribZero > 0
      ? (params.userA.deposit + resultAtZero.userATotalPayments) / totalContribZero
      : 0.5;
  if (userAEquityAtZero >= targetEquityUserA - 0.001) {
    return 0;
  }

  let lo = 0;
  let hi = M * 5;

  for (let i = 0; i < 100; i++) {
    const T = Math.round((lo + hi) / 2);
    const result = simulateSchedule(params, M, userBBase, T, startDate);
    const totalContrib =
      params.userA.deposit +
      params.userB.deposit +
      result.userATotalPayments +
      result.userBTotalPayments;
    const userAEquity =
      totalContrib > 0
        ? (params.userA.deposit + result.userATotalPayments) / totalContrib
        : 0.5;

    if (userAEquity < targetEquityUserA) {
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
  targetEquityUserA: number = 0.5
): ScheduleResult {
  const M = standardMonthlyPayment(
    params.loanAmount,
    params.monthlyRate,
    params.termMonths
  );
  const userBBase = Math.min(
    Math.round(params.userB.baseSplitPct * M),
    params.userB.monthlyCap ?? Infinity
  );
  const topUp = calculateTopUp(params, startDate, targetEquityUserA);
  const result = simulateSchedule(params, M, userBBase, topUp, startDate);

  const totalContrib =
    params.userA.deposit +
    params.userB.deposit +
    result.userATotalPayments +
    result.userBTotalPayments;
  const userAFinal =
    totalContrib > 0
      ? (params.userA.deposit + result.userATotalPayments) / totalContrib
      : 0.5;
  const userBFinal =
    totalContrib > 0
      ? (params.userB.deposit + result.userBTotalPayments) / totalContrib
      : 0.5;

  const lastRow = result.schedule[result.schedule.length - 1];
  const payoffDate = lastRow ? lastRow.date : startDate;

  return {
    monthlyBasePayment: M,
    monthlyTopUp: topUp,
    projectedMonths: result.months,
    projectedPayoffDate: payoffDate,
    schedule: result.schedule,
    convergenceAchieved: Math.abs(userAFinal - targetEquityUserA) < 0.01,
    userAFinalEquityPct: userAFinal,
    userBFinalEquityPct: userBFinal,
  };
}

export function checkConvergenceFeasibility(
  params: MortgageParams,
  startDate: string
): { feasible: boolean; bestAchievablePct: number } {
  const M = standardMonthlyPayment(
    params.loanAmount,
    params.monthlyRate,
    params.termMonths
  );
  const result = simulateSchedule(params, M, 0, M * 3, startDate);
  const totalContrib =
    params.userA.deposit +
    params.userB.deposit +
    result.userATotalPayments +
    result.userBTotalPayments;
  const bestPct =
    totalContrib > 0
      ? (params.userA.deposit + result.userATotalPayments) / totalContrib
      : 0.5;
  return { feasible: bestPct >= 0.5, bestAchievablePct: bestPct };
}

export interface ProjectFromBalanceOptions {
  params: MortgageParams;
  startBalance: number;
  startMonth: number;
  startDate: string;
  M: number;
  userBBase: number;
  topUp: number;
  initialUserATotal: number;
  initialUserBTotal: number;
  getExtraPayment?: (monthNumber: number) => number;
  maxMonths?: number;
}

/**
 * Projects the amortisation schedule from a given balance and month onward.
 * Used when past months are taken from actual payments; only future months are simulated.
 */
export function projectScheduleFromBalance(
  options: ProjectFromBalanceOptions
): { schedule: AmortisationRow[]; userATotalPayments: number; userBTotalPayments: number; months: number } {
  const {
    params,
    startBalance,
    startMonth,
    startDate,
    M,
    userBBase,
    topUp,
    initialUserATotal,
    initialUserBTotal,
    getExtraPayment,
    maxMonths = params.termMonths * 2,
  } = options;

  let balance = startBalance;
  let userATotalPayments = initialUserATotal;
  let userBTotalPayments = initialUserBTotal;
  const schedule: AmortisationRow[] = [];
  const [startYear, startMonthNum] = startDate.slice(0, 7).split("-").map(Number);
  let currentDate = new Date(startYear, startMonthNum - 1, 1);
  currentDate = addMonths(currentDate, startMonth - 1);
  let month = startMonth - 1;
  const maxMonth = startMonth + maxMonths;

  while (balance > 0.5 && month < maxMonth) {
    month++;
    const openingBalance = balance;
    const interest = Math.round(balance * params.monthlyRate);

    const extra = getExtraPayment ? getExtraPayment(month) : 0;
    let totalPayment = M + topUp + extra;
    if (totalPayment > balance + interest) {
      totalPayment = balance + interest;
    }

    let userBPay = Math.min(userBBase, totalPayment);
    const userAPay = totalPayment - userBPay;

    const principal = totalPayment - interest;
    balance = openingBalance - principal;

    userATotalPayments += userAPay;
    userBTotalPayments += userBPay;

    const totalContrib =
      params.userA.deposit +
      params.userB.deposit +
      userATotalPayments +
      userBTotalPayments;

    schedule.push({
      month,
      date: format(currentDate, "yyyy-MM"),
      openingBalance,
      interest,
      principal,
      totalPayment,
      userAPayment: userAPay,
      userBPayment: userBPay,
      userACumulativeEquityPct:
        totalContrib > 0
          ? (params.userA.deposit + userATotalPayments) / totalContrib
          : 0.5,
      userBCumulativeEquityPct:
        totalContrib > 0
          ? (params.userB.deposit + userBTotalPayments) / totalContrib
          : 0.5,
      closingBalance: Math.max(0, Math.round(balance)),
    });

    currentDate = addMonths(currentDate, 1);
  }

  return {
    schedule,
    userATotalPayments,
    userBTotalPayments,
    months: month,
  };
}
