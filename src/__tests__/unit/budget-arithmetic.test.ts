import { describe, it, expect } from "vitest";
import { calculateBudgetOverviewArithmetic } from "@/lib/services/finance/accounts";

// Phase 0 guardrail. These assert the per-category-available model that Phase 2
// introduces, so every `it.fails` below is red-until-Phase-2 by design: vitest
// treats the marker as a ratchet — once Phase 2 lands, `it.fails` itself starts
// failing and forces the flip back to `it`. Do not delete them.

const cats = [
  { id: 1, name: "Groceries", groupName: "Day to day", costType: "variable" as const, rollover: true },
  { id: 2, name: "Rent", groupName: "Bills", costType: "fixed" as const, rollover: true },
  { id: 3, name: "Car service", groupName: "Saving up", costType: "variable" as const, rollover: true },
];

function build(over: Partial<Parameters<typeof calculateBudgetOverviewArithmetic>[0]> = {}) {
  return calculateBudgetOverviewArithmetic({
    totalIncome: 3_200_000,
    totalExpenses: 1_798_000,
    categories: cats,
    allocationMap: new Map([[1, 500_000], [2, 1_200_000], [3, 40_000]]),
    carriedInMap: new Map([[3, 320_000]]),
    expenses: [
      { userId: 1, categoryId: 1, amount: 542_000 },
      { userId: 1, categoryId: 2, amount: 1_200_000 },
    ],
    spentByCategory: { 1: 542_000, 2: 1_200_000 },
    ...over,
  });
}

describe("budget arithmetic", () => {
  it("available = assigned + carriedIn - spent, per category", () => {
    const r = build();
    const by = new Map(r.categoryRows.map((c) => [c.categoryId, c]));
    expect(by.get(1)!.available).toBe(-42_000);        // 500000 + 0 - 542000
    expect(by.get(2)!.available).toBe(0);
    expect(by.get(3)!.available).toBe(360_000);        // 40000 + 320000 - 0
  });

  it("envelopeLeft is the sum of every category's available", () => {
    const r = build();
    const summed = r.categoryRows.reduce((s, c) => s + c.available, 0);
    expect(r.envelopeLeft).toBe(summed);
    expect(r.envelopeLeft).toBe(318_000);
  });

  it("envelopeTotal is assigned plus carried in", () => {
    const r = build();
    expect(r.envelopeTotal).toBe(500_000 + 1_200_000 + 40_000 + 320_000);
  });

  it("unassigned is income minus assigned, and ignores carry-in", () => {
    const r = build();
    expect(r.unallocated).toBe(3_200_000 - 1_740_000);
    expect(r.unallocated).toBe(1_460_000);
  });

  it("overspentTotal is the positive sum of negative availables", () => {
    const r = build();
    expect(r.overspentTotal).toBe(42_000);
  });

  it("a category with no allocation and no spend is inert", () => {
    const r = build({ allocationMap: new Map(), carriedInMap: new Map(), spentByCategory: {}, expenses: [] });
    expect(r.envelopeLeft).toBe(0);
    expect(r.overspentTotal).toBe(0);
  });
});
