import { describe, it, expect } from "vitest";
import {
  divideEqually,
  rebalanceAround,
  sharesFromRatios,
  solveShares,
  validateParticipantShares,
} from "@/lib/services/finance/participants";
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

describe("uneven shares", () => {
  it("honours a typed share exactly and lets the other absorb the rest", () => {
    // The case that started this: I owe 560, they owe 140, of a 700 bill.
    expect(solveShares(70_000, [1, 2], { 1: 56_000 })).toEqual([
      { userId: 1, shareMinor: 56_000 },
      { userId: 2, shareMinor: 14_000 },
    ]);
  });

  it("honours several typed shares at once", () => {
    expect(solveShares(90_000, [1, 2, 3], { 1: 50_000, 2: 30_000 })).toEqual([
      { userId: 1, shareMinor: 50_000 },
      { userId: 2, shareMinor: 30_000 },
      { userId: 3, shareMinor: 10_000 },
    ]);
  });

  it("splits the remainder between everyone still untouched", () => {
    expect(solveShares(100_00, [1, 2, 3], { 1: 40_00 })).toEqual([
      { userId: 1, shareMinor: 40_00 },
      { userId: 2, shareMinor: 30_00 },
      { userId: 3, shareMinor: 30_00 },
    ]);
  });

  it("still sums exactly when the remainder does not divide evenly", () => {
    const shares = solveShares(100, [1, 2, 3], { 1: 34 });
    expect(shares.reduce((s, p) => s + p.shareMinor, 0)).toBe(100);
    expect(shares).toEqual([
      { userId: 1, shareMinor: 34 },
      { userId: 2, shareMinor: 33 },
      { userId: 3, shareMinor: 33 },
    ]);
  });

  it("never leaves an untouched person owing a negative", () => {
    const shares = solveShares(10_000, [1, 2], { 1: 99_999 });
    expect(shares).toEqual([
      { userId: 1, shareMinor: 10_000 },
      { userId: 2, shareMinor: 0 },
    ]);
  });

  it("returns typed shares untouched when every share is set, so the sheet can show the gap", () => {
    // 560 + 100 of a 700 bill: R40 short, and it is not this function's job to
    // quietly move someone's number to cover it.
    const shares = solveShares(70_000, [1, 2], { 1: 56_000, 2: 10_000 });
    expect(shares).toEqual([
      { userId: 1, shareMinor: 56_000 },
      { userId: 2, shareMinor: 10_000 },
    ]);
    expect(validateParticipantShares(70_000, shares, 1).ok).toBe(false);
  });

  it("an all-pinned set that does add up validates", () => {
    const shares = solveShares(70_000, [1, 2], { 1: 56_000, 2: 14_000 });
    expect(validateParticipantShares(70_000, shares, 1)).toEqual({ ok: true });
  });

  it("rebalanceAround stays the single-pin form of the same solver", () => {
    const base = [
      { userId: 1, shareMinor: 45_000 },
      { userId: 2, shareMinor: 45_000 },
    ];
    expect(rebalanceAround(90_000, base, 1, 60_000)).toEqual([
      { userId: 1, shareMinor: 60_000 },
      { userId: 2, shareMinor: 30_000 },
    ]);
  });
});

describe("splitting by ratio", () => {
  it("turns 80/20 into the amounts a person would say", () => {
    expect(sharesFromRatios(70_000, { 1: 80, 2: 20 })).toEqual([
      { userId: 1, shareMinor: 56_000 },
      { userId: 2, shareMinor: 14_000 },
    ]);
  });

  it("takes weights, not just percentages", () => {
    expect(sharesFromRatios(120_00, { 1: 2, 2: 1, 3: 1 })).toEqual([
      { userId: 1, shareMinor: 60_00 },
      { userId: 2, shareMinor: 30_00 },
      { userId: 3, shareMinor: 30_00 },
    ]);
  });

  it("never loses a cent, whatever the ratio", () => {
    for (const amount of [1, 7, 100, 101, 999, 84_231]) {
      const ratioSets: Record<number, number>[] = [
        { 1: 1, 2: 1 },
        { 1: 1, 2: 1, 3: 1 },
        { 1: 70, 2: 30 },
        { 1: 1, 2: 2, 3: 5 },
      ];
      for (const ratios of ratioSets) {
        const shares = sharesFromRatios(amount, ratios);
        expect(shares.reduce((s, p) => s + p.shareMinor, 0)).toBe(amount);
      }
    }
  });

  it("a third each of R100 is 34/33/33, not three lots of R33,33", () => {
    const shares = sharesFromRatios(100, { 1: 1, 2: 1, 3: 1 });
    expect(shares.reduce((s, p) => s + p.shareMinor, 0)).toBe(100);
    expect(shares.map((p) => p.shareMinor).sort((a, b) => b - a)).toEqual([34, 33, 33]);
  });

  it("falls back to an even split when every ratio is zero", () => {
    expect(sharesFromRatios(90_000, { 1: 0, 2: 0 })).toEqual([
      { userId: 1, shareMinor: 45_000 },
      { userId: 2, shareMinor: 45_000 },
    ]);
  });

  it("produces shares the validator accepts", () => {
    const shares = sharesFromRatios(84_231, { 1: 65, 2: 35 });
    expect(validateParticipantShares(84_231, shares, 1)).toEqual({ ok: true });
  });
});
