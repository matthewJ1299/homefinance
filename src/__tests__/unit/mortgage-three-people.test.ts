/**
 * The engine models any number of people on the bond.
 *
 * Before this, `buildParams` sorted the user configs, took the first two and
 * threw the rest away, so a third person on the bond did not exist to the
 * schedule at all -- and the pages then handed them the second person's
 * figures as though they were their own.
 */
import { describe, it, expect } from "vitest";
import { generateSchedule, simulateSchedule, standardMonthlyPayment } from "@/lib/services/mortgage-calculator";
import type { MortgageParams } from "@/lib/types/mortgage.types";

const A = 1;
const B = 2;
const C = 3;

const threePeople: MortgageParams = {
  loanAmount: 1_800_000,
  monthlyRate: 0.0095,
  termMonths: 240,
  propertyValue: 2_200_000,
  people: [
    // A holds the largest split, so A carries the remainder.
    { userId: A, deposit: 300_000, baseSplitPct: 0.5, monthlyCap: null },
    { userId: B, deposit: 100_000, baseSplitPct: 0.3, monthlyCap: null },
    { userId: C, deposit: 0, baseSplitPct: 0.2, monthlyCap: 4_000 },
  ],
};

describe("a bond with three people on it", () => {
  it("splits every month across all three, summing to the payment", () => {
    const M = standardMonthlyPayment(
      threePeople.loanAmount,
      threePeople.monthlyRate,
      threePeople.termMonths
    );
    const { schedule } = simulateSchedule(
      threePeople,
      M,
      { [B]: Math.round(0.3 * M), [C]: 4_000 },
      0,
      "2024-01"
    );
    expect(schedule.length).toBeGreaterThan(0);
    for (const row of schedule) {
      const paid = row.paymentByUserId;
      expect(Object.keys(paid).map(Number).sort()).toEqual([A, B, C]);
      expect(paid[A] + paid[B] + paid[C]).toBe(row.totalPayment);
      // Nobody pays a negative amount to make the arithmetic close.
      for (const id of [A, B, C]) expect(paid[id]).toBeGreaterThanOrEqual(0);
    }
  });

  it("gives every person a share, and the shares add to one", () => {
    const result = generateSchedule(threePeople, "2024-01", 0.5);
    const equity = result.finalEquityPctByUserId;
    expect(Object.keys(equity).map(Number).sort()).toEqual([A, B, C]);
    const total = equity[A] + equity[B] + equity[C];
    expect(Math.abs(total - 1)).toBeLessThan(1e-9);
    // The capped person still ends up owning something.
    expect(equity[C]).toBeGreaterThan(0);
  });

  it("honours a monthly cap without stranding the remainder", () => {
    const M = standardMonthlyPayment(
      threePeople.loanAmount,
      threePeople.monthlyRate,
      threePeople.termMonths
    );
    const { schedule } = simulateSchedule(
      threePeople,
      M,
      { [B]: Math.round(0.3 * M), [C]: 4_000 },
      0,
      "2024-01"
    );
    for (const row of schedule.slice(0, 12)) {
      expect(row.paymentByUserId[C]).toBeLessThanOrEqual(4_000);
    }
  });

  it("is the same arithmetic as two people when there are two", () => {
    // The primary carries the remainder either way; adding a third person is
    // the only thing that changes.
    const twoPeople: MortgageParams = {
      ...threePeople,
      people: threePeople.people.slice(0, 2),
    };
    const M = standardMonthlyPayment(
      twoPeople.loanAmount,
      twoPeople.monthlyRate,
      twoPeople.termMonths
    );
    const base = Math.round(0.3 * M);
    const { schedule } = simulateSchedule(twoPeople, M, { [B]: base }, 0, "2024-01");
    for (const row of schedule.slice(0, 24)) {
      expect(row.paymentByUserId[B]).toBe(Math.min(base, row.totalPayment));
      expect(row.paymentByUserId[A]).toBe(row.totalPayment - row.paymentByUserId[B]);
    }
  });

  it("a single person on the bond owns all of it", () => {
    const solo: MortgageParams = {
      ...threePeople,
      people: [{ userId: A, deposit: 300_000, baseSplitPct: 1, monthlyCap: null }],
    };
    const result = generateSchedule(solo, "2024-01", 1);
    expect(result.finalEquityPctByUserId[A]).toBe(1);
    for (const row of result.schedule) {
      expect(row.paymentByUserId[A]).toBe(row.totalPayment);
    }
  });
});
