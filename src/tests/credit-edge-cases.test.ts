import { describe, it, expect } from "vitest";
import { estimateCreditPayoff } from "@/lib/services/finance/credit";

describe("estimateCreditPayoff edge cases", () => {
  it("returns null months when payment only covers interest", () => {
    const debt = 10_000_00;
    const apr = 0.12;
    const monthlyRate = apr / 12;
    const interestOnly = Math.round(debt * monthlyRate);
    const result = estimateCreditPayoff({
      debt,
      apr,
      monthlyPayment: interestOnly,
    });
    expect(result.months).toBeNull();
  });

  it("payoff when payment exceeds interest", () => {
    const debt = 5000_00;
    const result = estimateCreditPayoff({
      debt,
      apr: 0.12,
      monthlyPayment: 600_00,
    });
    expect(result.months).not.toBeNull();
    expect(result.months).toBeGreaterThan(0);
  });

  it("returns zero months for zero debt", () => {
    const result = estimateCreditPayoff({ debt: 0, apr: 0.12, monthlyPayment: 100_00 });
    expect(result.months).toBe(0);
    expect(result.totalInterest).toBe(0);
  });
});
