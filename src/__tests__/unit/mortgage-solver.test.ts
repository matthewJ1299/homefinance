import { describe, it, expect } from "vitest";
import { solveShares } from "@/lib/services/finance/mortgage-plan";

const base = {
  price: 3_000_000_00,
  paymentMinor: 21_400_00,
  termMonths: 240,
  annualRateBp: 1_100,
  deposits: [{ userId: 2, amountMinor: 780_000_00 }],
  targets: [{ userId: 1, shareBp: 5_000 }, { userId: 2, shareBp: 5_000 }],
};

describe("mortgage share solver", () => {
  it("gives the non-depositor the larger share", () => {
    const r = solveShares(base);
    expect(r.reachable).toBe(true);
    const matt = r.shares.find((s) => s.userId === 1)!;
    const syd = r.shares.find((s) => s.userId === 2)!;
    expect(matt.monthlyMinor).toBeGreaterThan(syd.monthlyMinor);
  });

  it("the shares sum to the total payment exactly", () => {
    const r = solveShares(base);
    expect(r.shares.reduce((s, x) => s + x.monthlyMinor, 0)).toBe(base.paymentMinor);
  });

  it("lands on the target split within a rand at term end", () => {
    const r = solveShares(base);
    for (const s of r.shares) {
      const target = base.targets.find((t) => t.userId === s.userId)!.shareBp;
      expect(Math.abs(s.projectedShareBp - target)).toBeLessThanOrEqual(1);
    }
  });

  it("equal payments and no deposits means equal shares", () => {
    const r = solveShares({ ...base, deposits: [] });
    const [a, b] = r.shares;
    expect(Math.abs(a.monthlyMinor - b.monthlyMinor)).toBeLessThanOrEqual(1);
  });

  it("reports an unreachable target instead of clamping", () => {
    const r = solveShares({
      ...base,
      targets: [{ userId: 1, shareBp: 9_900 }, { userId: 2, shareBp: 100 }],
    });
    expect(r.reachable).toBe(false);
    expect(r.closest).toBeDefined();
    expect(r.shares.reduce((s, x) => s + x.monthlyMinor, 0)).toBe(base.paymentMinor);
    expect(r.blockers.length).toBeGreaterThan(0);
  });

  it("holds the target when the rate changes", () => {
    const before = solveShares(base);
    const after = solveShares({ ...base, annualRateBp: 1_250 });
    for (const s of after.shares) {
      const target = base.targets.find((t) => t.userId === s.userId)!.shareBp;
      expect(Math.abs(s.projectedShareBp - target)).toBeLessThanOrEqual(1);
    }
    expect(after.shares).not.toEqual(before.shares);
  });
});
