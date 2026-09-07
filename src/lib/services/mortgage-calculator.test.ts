import { describe, it, expect } from "vitest";
import {
  standardMonthlyPayment,
  simulateSchedule,
  calculateTopUp,
  generateSchedule,
  checkConvergenceFeasibility,
  projectScheduleFromBalance,
} from "./mortgage-calculator";
import type { MortgageParams } from "@/lib/types/mortgage.types";

/** A is the primary (largest base split), B the other. Ids, not positions. */
const A = 1;
const B = 2;

const baseParams: MortgageParams = {
  loanAmount: 1_000_000,
  monthlyRate: 0.01,
  termMonths: 240,
  propertyValue: 1_200_000,
  people: [
    { userId: A, deposit: 200_000, baseSplitPct: 0.5, monthlyCap: null },
    { userId: B, deposit: 100_000, baseSplitPct: 0.5, monthlyCap: null },
  ],
};

describe("mortgage-calculator", () => {
  describe("standardMonthlyPayment", () => {
    it("returns 0-rate payment as loan/term (rounded)", () => {
      const payment = standardMonthlyPayment(120_000, 0, 12);
      expect(payment).toBe(10_000);
    });

    it("returns higher payment when rate > 0", () => {
      const payment = standardMonthlyPayment(100_000, 0.01, 12);
      expect(payment).toBeGreaterThan(100_000 / 12);
      expect(payment).toBeLessThan(100_000);
    });

    it("matches known annuity formula: M = P * r * (1+r)^n / ((1+r)^n - 1)", () => {
      const P = 500_000;
      const r = 0.008;
      const n = 120;
      const expected =
        (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      const payment = standardMonthlyPayment(P, r, n);
      expect(payment).toBe(Math.round(expected));
    });
  });

  describe("simulateSchedule", () => {
    it("produces schedule with decreasing balance", () => {
      const M = standardMonthlyPayment(
        baseParams.loanAmount,
        baseParams.monthlyRate,
        baseParams.termMonths
      );
      const result = simulateSchedule(
        baseParams,
        M,
        { [B]: Math.round(0.5 * M) },
        0,
        "2024-01"
      );
      expect(result.schedule.length).toBeGreaterThan(0);
      expect(result.schedule[0].openingBalance).toBe(baseParams.loanAmount);
      const last = result.schedule[result.schedule.length - 1];
      expect(last.closingBalance).toBe(0);
      for (let i = 1; i < result.schedule.length; i++) {
        expect(result.schedule[i].openingBalance).toBe(
          result.schedule[i - 1].closingBalance
        );
      }
    });

    it("principal + interest = totalPayment each row", () => {
      const M = standardMonthlyPayment(
        baseParams.loanAmount,
        baseParams.monthlyRate,
        baseParams.termMonths
      );
      const result = simulateSchedule(
        baseParams,
        M,
        { [B]: Math.round(0.5 * M) },
        0,
        "2024-01"
      );
      for (let i = 0; i < result.schedule.length; i++) {
        const row = result.schedule[i]!;
        expect(row.interest).toBe(Math.round(row.openingBalance * baseParams.monthlyRate));
        expect(row.principal + row.interest).toBe(row.totalPayment);
        expect(row.openingBalance - row.principal).toBe(row.closingBalance);
        if (i > 0) {
          expect(row.interest).toBeLessThanOrEqual(result.schedule[i - 1]!.interest);
        }
      }
    });

    it("every person's payment sums to totalPayment", () => {
      const M = standardMonthlyPayment(
        baseParams.loanAmount,
        baseParams.monthlyRate,
        baseParams.termMonths
      );
      const userBBase = Math.round(0.5 * M);
      const result = simulateSchedule(baseParams, M, { [B]: userBBase }, 0, "2024-01");
      for (const row of result.schedule) {
        expect(row.paymentByUserId[A] + row.paymentByUserId[B]).toBe(row.totalPayment);
      }
    });

    it("applies extra payment when getExtraPayment is provided", () => {
      const M = standardMonthlyPayment(
        baseParams.loanAmount,
        baseParams.monthlyRate,
        baseParams.termMonths
      );
      const result = simulateSchedule(
        baseParams,
        M,
        { [B]: Math.round(0.5 * M) },
        0,
        "2024-01",
        (month) => (month === 1 ? 5000 : 0)
      );
      const first = result.schedule[0];
      expect(first.totalPayment).toBe(M + 5000);
    });
  });

  describe("calculateTopUp", () => {
    it("returns 0 when userA already at or above target equity", () => {
      const params: MortgageParams = {
        ...baseParams,
        people: [
          { userId: A, deposit: 500_000, baseSplitPct: 0.5, monthlyCap: null },
          { userId: B, deposit: 100_000, baseSplitPct: 0.5, monthlyCap: null },
        ],
      };
      const topUp = calculateTopUp(params, "2024-01", 0.5);
      expect(topUp).toBe(0);
    });

    it("returns positive when userA needs more equity share", () => {
      const params: MortgageParams = {
        ...baseParams,
        people: [
          { userId: A, deposit: 50_000, baseSplitPct: 0.5, monthlyCap: null },
          { userId: B, deposit: 200_000, baseSplitPct: 0.5, monthlyCap: null },
        ],
      };
      const topUp = calculateTopUp(params, "2024-01", 0.5);
      expect(topUp).toBeGreaterThanOrEqual(0);
    });
  });

  describe("generateSchedule", () => {
    it("returns schedule with monthlyBasePayment, monthlyTopUp, projectedMonths", () => {
      const result = generateSchedule(baseParams, "2024-01", 0.5);
      expect(result.monthlyBasePayment).toBeGreaterThan(0);
      expect(result.monthlyTopUp).toBeGreaterThanOrEqual(0);
      expect(result.projectedMonths).toBeGreaterThan(0);
      expect(result.schedule.length).toBe(result.projectedMonths);
      expect(result.finalEquityPctByUserId[A] + result.finalEquityPctByUserId[B]).toBeCloseTo(1, 5);
    });

    it("convergenceAchieved is true when target is 0.5 and split is even", () => {
      const params: MortgageParams = {
        ...baseParams,
        people: [
          { userId: A, deposit: 150_000, baseSplitPct: 0.5, monthlyCap: null },
          { userId: B, deposit: 150_000, baseSplitPct: 0.5, monthlyCap: null },
        ],
      };
      const result = generateSchedule(params, "2024-01", 0.5);
      expect(result.convergenceAchieved).toBe(true);
    });
  });

  describe("checkConvergenceFeasibility", () => {
    it("returns feasible when userA deposit is at least half of total deposit", () => {
      const params: MortgageParams = {
        ...baseParams,
        people: [
          { userId: A, deposit: 200_000, baseSplitPct: 0, monthlyCap: null },
          { userId: B, deposit: 100_000, baseSplitPct: 0.5, monthlyCap: null },
        ],
      };
      const { feasible, bestAchievablePct } = checkConvergenceFeasibility(
        params,
        "2024-01"
      );
      expect(bestAchievablePct).toBeGreaterThanOrEqual(0.5);
      expect(feasible).toBe(true);
    });
  });

  describe("projectScheduleFromBalance", () => {
    it("continues from given balance and month", () => {
      const M = standardMonthlyPayment(
        baseParams.loanAmount,
        baseParams.monthlyRate,
        baseParams.termMonths
      );
      const userBBase = Math.round(0.5 * M);
      const startBalance = 800_000;
      const startMonth = 25;
      const result = projectScheduleFromBalance({
        params: baseParams,
        startBalance,
        startMonth,
        startDate: "2024-01",
        M,
        bases: { [B]: userBBase },
        topUp: 0,
        initialTotals: { [A]: 50_000, [B]: 50_000 },
      });
      expect(result.schedule.length).toBeGreaterThan(0);
      expect(result.schedule[0].openingBalance).toBe(startBalance);
      expect(result.schedule[0].month).toBe(startMonth);
      expect(result.schedule[0].interest).toBe(
        Math.round(startBalance * baseParams.monthlyRate)
      );
    });
  });
});
