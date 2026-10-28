import { describe, it, expect } from "vitest";
import { computeSpreadIncrements } from "./spread";

const sum = (xs: { increment: number }[]) => xs.reduce((s, x) => s + x.increment, 0);

describe("computeSpreadIncrements", () => {
  it("splits evenly when there is no spending history", () => {
    const { increments, weightedByHistory } = computeSpreadIncrements([1, 2, 3], {}, 300);
    expect(weightedByHistory).toBe(false);
    expect(increments).toEqual([
      { categoryId: 1, increment: 100 },
      { categoryId: 2, increment: 100 },
      { categoryId: 3, increment: 100 },
    ]);
  });

  it("hands leftover cents to the first recipients (even weights, stable order)", () => {
    const { increments } = computeSpreadIncrements([1, 2, 3], {}, 301);
    expect(increments.map((i) => i.increment)).toEqual([101, 100, 100]);
    expect(sum(increments)).toBe(301);
  });

  it("weights by history and orders heaviest first", () => {
    const { increments, weightedByHistory } = computeSpreadIncrements(
      [10, 20],
      { 10: 300, 20: 100 },
      100
    );
    expect(weightedByHistory).toBe(true);
    expect(increments).toEqual([
      { categoryId: 10, increment: 75 },
      { categoryId: 20, increment: 25 },
    ]);
  });

  it("gives the rounding remainder to the heaviest weight", () => {
    // Weights 2/3 and 1/3 of 100 -> 66 and 33, one cent left over -> to the heavier.
    const { increments } = computeSpreadIncrements([10, 20], { 10: 200, 20: 100 }, 100);
    expect(increments).toEqual([
      { categoryId: 10, increment: 67 },
      { categoryId: 20, increment: 33 },
    ]);
    expect(sum(increments)).toBe(100);
  });

  it("omits categories that receive nothing", () => {
    const { increments } = computeSpreadIncrements([10, 20], { 10: 1000, 20: 0 }, 3);
    expect(increments).toEqual([{ categoryId: 10, increment: 3 }]);
  });

  it("always distributes the whole remainder", () => {
    const { increments } = computeSpreadIncrements(
      [1, 2, 3, 4, 5],
      { 1: 137, 2: 41, 3: 908, 4: 12, 5: 555 },
      99997
    );
    expect(sum(increments)).toBe(99997);
  });

  it("returns nothing for no recipients or a non-positive remainder", () => {
    expect(computeSpreadIncrements([], { 1: 100 }, 500).increments).toEqual([]);
    expect(computeSpreadIncrements([1, 2], {}, 0).increments).toEqual([]);
  });
});
