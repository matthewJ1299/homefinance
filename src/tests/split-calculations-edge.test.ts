import { describe, it, expect } from "vitest";
import {
  splitExpense,
  splitExpenseWithRatios,
  calculateSplitBalance,
} from "@/lib/services/finance/accounts";

describe("splitExpense edge cases", () => {
  it("distributes odd-cent remainder to first user (101 -> 51/50)", () => {
    const result = splitExpense({ amount: 101, users: ["A", "B"] });
    expect(result.A + result.B).toBe(101);
    expect(result).toEqual({ A: 51, B: 50 });
  });

  it("returns empty object for zero users", () => {
    expect(splitExpense({ amount: 100, users: [] })).toEqual({});
  });

  it("handles three-way odd split (100 -> 34/33/33)", () => {
    const result = splitExpense({ amount: 100, users: ["A", "B", "C"] });
    expect(result.A + result.B + result.C).toBe(100);
    expect(result.A).toBe(34);
    expect(result.B).toBe(33);
    expect(result.C).toBe(33);
  });
});

describe("splitExpenseWithRatios edge cases", () => {
  it("preserves total for weighted split", () => {
    const result = splitExpenseWithRatios({ amount: 101, splits: { A: 1, B: 1 } });
    expect(result.A + result.B).toBe(101);
  });
});

describe("calculateSplitBalance edge cases", () => {
  it("nets over-settlement per user instead of negative owedToMe", () => {
    const result = calculateSplitBalance({
      currentUserId: 1,
      allocations: [
        {
          paidByUserId: 1,
          paidByUserName: "A",
          allocationUserId: 2,
          allocationUserName: "B",
          amount: 50,
        },
      ],
      settlements: [
        {
          payerUserId: 2,
          payerUserName: "B",
          recipientUserId: 1,
          recipientUserName: "A",
          amount: 80,
        },
      ],
    });

    const b = result.perUser.find((u) => u.userId === 2);
    expect(b?.owedToMe).toBe(0);
    expect(b?.iOwe).toBe(30);
    expect(result.owedToMe).toBe(0);
    expect(result.iOwe).toBe(30);
  });

  it("computes payer iOwe after settlement", () => {
    const result = calculateSplitBalance({
      currentUserId: 2,
      allocations: [
        {
          paidByUserId: 1,
          paidByUserName: "A",
          allocationUserId: 2,
          allocationUserName: "B",
          amount: 100,
        },
      ],
      settlements: [
        {
          payerUserId: 2,
          payerUserName: "B",
          recipientUserId: 1,
          recipientUserName: "A",
          amount: 40,
        },
      ],
    });

    expect(result.iOwe).toBe(60);
    expect(result.net).toBe(-60);
  });
});
