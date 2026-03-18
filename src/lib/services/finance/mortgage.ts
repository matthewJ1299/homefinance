import {
  standardMonthlyPayment as standardMonthlyPaymentImpl,
} from "@/lib/services/mortgage-calculator";
import type { MortgageParams, AmortisationRow, ScheduleResult } from "@/lib/types/mortgage.types";
import { simulateSchedule, calculateTopUp, generateSchedule, checkConvergenceFeasibility, projectScheduleFromBalance } from "@/lib/services/mortgage-calculator";

export type MortgageSplit = Record<string, number>;

export interface MortgagePaymentInput {
  principal: number;
  rate: number; // monthly rate (e.g. APR/12)
  months: number;
}

export interface MortgageAmortizationStepInput {
  balance: number;
  rate: number; // monthly rate
  payment: number; // total payment for the month
}

export function calculateMortgagePayment(input: MortgagePaymentInput): number {
  return standardMonthlyPaymentImpl(input.principal, input.rate, input.months);
}

export function calculateAmortizationStep(input: MortgageAmortizationStepInput): {
  interest: number;
  principal: number;
  totalPayment: number;
  closingBalance: number;
} {
  const interest = Math.round(input.balance * input.rate);

  // Keep consistent with the schedule simulator's cap.
  const totalPayment = Math.min(input.payment, input.balance + interest);
  const principal = totalPayment - interest;

  const closingBalance = Math.max(0, Math.round(input.balance - principal));
  return { interest, principal, totalPayment, closingBalance };
}

export function simulateMortgage(input: {
  loanAmount: number;
  rate: number; // monthly rate
  termMonths: number;
  extraPayment?: number;
  extraPaymentEveryMonth?: boolean;
  maxMonths?: number;
}): {
  months: number;
  totalInterest: number;
  monthlyPayment: number;
  finalBalance: number;
} {
  const loanAmount = input.loanAmount;
  const monthlyRate = input.rate;
  const termMonths = Math.max(1, Math.floor(input.termMonths));
  const extraPayment = input.extraPayment ?? 0;
  const extraPaymentEveryMonth = input.extraPaymentEveryMonth ?? true;
  const maxMonths = input.maxMonths ?? termMonths * 2;

  const monthlyPayment = standardMonthlyPaymentImpl(loanAmount, monthlyRate, termMonths);

  let balance = loanAmount;
  let totalInterest = 0;
  let months = 0;

  while (balance > 0.5 && months < maxMonths) {
    months += 1;
    const interest = Math.round(balance * monthlyRate);
    totalInterest += interest;

    const extra = extraPaymentEveryMonth ? extraPayment : 0;
    let payment = monthlyPayment + extra;
    payment = Math.min(payment, balance + interest);

    const principal = payment - interest;
    balance = balance - principal;
  }

  return { months, totalInterest, monthlyPayment, finalBalance: Math.max(0, Math.round(balance)) };
}

export function splitMortgageContributions(input: {
  payment: number;
  split: Record<string, number>;
}): Record<string, number> {
  const { payment } = input;
  const split = input.split;
  const keys = Object.keys(split);
  if (keys.length === 0) return {};

  const sum = keys.reduce((s, k) => s + split[k], 0);
  if (sum === 0) return Object.fromEntries(keys.map((k) => [k, 0]));

  // Interpret split as percentages when it sums to ~100, otherwise treat as fractions.
  const normalizer = Math.abs(sum - 100) <= 1e-9 ? 100 : sum;
  const out: Record<string, number> = {};
  for (const k of keys) {
    out[k] = Math.round((payment * split[k]) / normalizer);
  }
  return out;
}

// Re-export existing amortisation engine so other parts of the app can switch to `finance/mortgage`
// without changing behaviour.
export {
  standardMonthlyPaymentImpl as standardMonthlyPayment,
  simulateSchedule,
  calculateTopUp,
  generateSchedule,
  checkConvergenceFeasibility,
  projectScheduleFromBalance,
};

export type { MortgageParams, AmortisationRow, ScheduleResult };

