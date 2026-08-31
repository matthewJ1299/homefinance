function monthlyPaymentFromBalance(
  loanAmount: number,
  monthlyRate: number,
  termMonths: number
): number {
  if (monthlyRate <= 0) return Math.ceil(loanAmount / termMonths);
  const r = monthlyRate;
  const n = termMonths;
  const payment = (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(payment);
}

export interface MortgageRatePeriod {
  effectiveFromMonth: number;
  annualInterestRate: number;
}

export interface MortgageRateSchedule {
  defaultAnnualRate: number;
  periods: ReadonlyArray<MortgageRatePeriod>;
}

export function resolveAnnualRateForMonth(
  monthNumber: number,
  schedule: MortgageRateSchedule
): number {
  let rate = schedule.defaultAnnualRate;
  const sorted = [...schedule.periods].sort(
    (a, b) => a.effectiveFromMonth - b.effectiveFromMonth
  );

  for (const period of sorted) {
    if (period.effectiveFromMonth <= monthNumber) {
      rate = period.annualInterestRate;
    } else {
      break;
    }
  }

  return rate;
}

export function resolveMonthlyRateForMonth(
  monthNumber: number,
  schedule: MortgageRateSchedule
): number {
  return resolveAnnualRateForMonth(monthNumber, schedule) / 12;
}

export function hasRateChangeAtMonth(
  monthNumber: number,
  schedule: MortgageRateSchedule
): boolean {
  if (monthNumber <= 1) return true;
  return (
    resolveAnnualRateForMonth(monthNumber, schedule) !==
    resolveAnnualRateForMonth(monthNumber - 1, schedule)
  );
}

export function calculateBasePaymentForMonth(input: {
  monthNumber: number;
  openingBalance: number;
  totalTermMonths: number;
  rateSchedule: MortgageRateSchedule;
}): number {
  const monthlyRate = resolveMonthlyRateForMonth(input.monthNumber, input.rateSchedule);
  const remainingTermMonths = Math.max(
    1,
    input.totalTermMonths - input.monthNumber + 1
  );
  return monthlyPaymentFromBalance(
    input.openingBalance,
    monthlyRate,
    remainingTermMonths
  );
}

export function calculateUserBBaseForPayment(
  payment: number,
  baseSplitPct: number,
  monthlyCap: number | null
): number {
  return Math.min(Math.round(baseSplitPct * payment), monthlyCap ?? Infinity);
}
