import { describe, it, expect } from "vitest";
import { divideEqually, validateParticipantShares } from "@/lib/services/finance/participants";
import { formatRand } from "@/lib/utils/currency";

describe("dividing a bill", () => {
  it.each([
    [90_000, [1], { 1: 90_000 }],
    [90_000, [1, 2], { 1: 45_000, 2: 45_000 }],
    [90_000, [1, 2, 3], { 1: 30_000, 2: 30_000, 3: 30_000 }],
    [90_000, [1, 2, 3, 4], { 1: 22_500, 2: 22_500, 3: 22_500, 4: 22_500 }],
  ])("divides %i among %j", (amount, ids, expected) => {
    expect(divideEqually(amount as number, ids as number[])).toEqual(expected);
  });

  it("never loses a cent to rounding", () => {
    for (const amount of [1, 7, 100, 101, 999, 84_231]) {
      for (const n of [1, 2, 3, 4, 5, 7]) {
        const ids = Array.from({ length: n }, (_, i) => i + 1);
        const shares = divideEqually(amount, ids);
        const sum = Object.values(shares).reduce((s, v) => s + v, 0);
        expect(sum).toBe(amount);
      }
    }
  });

  it("gives the remainder to the earliest participants, deterministically", () => {
    expect(divideEqually(100, [1, 2, 3])).toEqual({ 1: 34, 2: 33, 3: 33 });
    expect(divideEqually(100, [1, 2, 3])).toEqual(divideEqually(100, [1, 2, 3]));
  });

  it("rejects shares that do not sum to the amount", () => {
    expect(validateParticipantShares(90_000, [
      { userId: 1, shareMinor: 45_000 },
      { userId: 2, shareMinor: 44_999 },
    ])).toEqual({
      ok: false,
      // Composed rather than a literal: en-ZA puts a non-breaking space after
      // the R, so a hand-typed "R 899,99" never matches.
      error: `Shares add up to ${formatRand(89_999)}, not ${formatRand(90_000)}`,
    });
  });

  it("rejects a participant list without the payer", () => {
    expect(validateParticipantShares(1_000, [{ userId: 2, shareMinor: 1_000 }], 1))
      .toEqual({ ok: false, error: "The payer must be one of the participants" });
  });

  it("rejects duplicate participants", () => {
    expect(validateParticipantShares(1_000, [
      { userId: 1, shareMinor: 500 },
      { userId: 1, shareMinor: 500 },
    ], 1).ok).toBe(false);
  });
});
