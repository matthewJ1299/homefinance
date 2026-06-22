import { describe, it, expect } from "vitest";
import { simulateSchedule } from "@/lib/services/mortgage-calculator";
import type { MortgageParams } from "@/lib/types/mortgage.types";
import {
  calculateBasePaymentForMonth,
  resolveAnnualRateForMonth,
  type MortgageRateSchedule,
} from "@/lib/services/finance/mortgage-rate-periods";

const params: MortgageParams = {
  loanAmount: 1_000_000_00,
  monthlyRate: 0.1 / 12,
  termMonths: 120,
  propertyValue: 1_200_000_00,
  userA: { deposit: 100_000_00, baseSplitPct: 0.5, monthlyCap: null },
  userB: { deposit: 100_000_00, baseSplitPct: 0.5, monthlyCap: null },
};

const rateSchedule: MortgageRateSchedule = {
  defaultAnnualRate: 0.1,
  periods: [{ effectiveFromMonth: 6, annualInterestRate: 0.11 }],
};

describe("mortgage rate periods", () => {
  it("uses default rate until a period starts", () => {
    expect(resolveAnnualRateForMonth(1, rateSchedule)).toBe(0.1);
    expect(resolveAnnualRateForMonth(5, rateSchedule)).toBe(0.1);
    expect(resolveAnnualRateForMonth(6, rateSchedule)).toBe(0.11);
  });

  it("recalculates base payment when the rate changes mid-loan", () => {
    const { schedule } = simulateSchedule(
      params,
      0,
      0,
      0,
      "2024-01",
      undefined,
      rateSchedule
    );

    const month5 = schedule[4]!;
    const month6 = schedule[5]!;

    expect(month5.interest).toBe(Math.round(month5.openingBalance * (0.1 / 12)));
    expect(month6.interest).toBe(Math.round(month6.openingBalance * (0.11 / 12)));
    expect(month6.totalPayment).toBeGreaterThan(month5.totalPayment);
  });

  it("matches explicit payment recalculation at the rate boundary", () => {
    const { schedule } = simulateSchedule(
      params,
      0,
      0,
      0,
      "2024-01",
      undefined,
      rateSchedule
    );
    const month6 = schedule[5]!;

    const expectedPayment = calculateBasePaymentForMonth({
      monthNumber: 6,
      openingBalance: month6.openingBalance,
      totalTermMonths: params.termMonths,
      rateSchedule,
    });

    expect(month6.totalPayment).toBe(expectedPayment);
  });
});
