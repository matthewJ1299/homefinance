import { describe, it, expect } from "vitest";
import {
  reconSplitsFiledPayload,
  summariseReconSplits,
} from "@/lib/push/recon-split-notification";
import { PUSHABLE_KINDS } from "@/lib/services/notification.service";
import { formatRand } from "@/lib/utils/currency";

const ME = 1;
const SYDNEY = 2;
const SAM = 3;

describe("summariseReconSplits", () => {
  it("rolls a batch up into count, total and share per other person", () => {
    const expenses = [
      { id: 10, amount: 45000 },
      { id: 11, amount: 10000 },
      { id: 12, amount: 20000 },
    ];
    const shares = [
      { expenseId: 10, userId: ME, shareMinor: 22500 },
      { expenseId: 10, userId: SYDNEY, shareMinor: 22500 },
      { expenseId: 11, userId: ME, shareMinor: 5000 },
      { expenseId: 11, userId: SYDNEY, shareMinor: 5000 },
      { expenseId: 12, userId: ME, shareMinor: 10000 },
      { expenseId: 12, userId: SAM, shareMinor: 10000 },
    ];
    const out = summariseReconSplits(ME, expenses, shares);
    expect(out).toEqual([
      { userId: SYDNEY, count: 2, totalMinor: 55000, shareMinor: 27500 },
      { userId: SAM, count: 1, totalMinor: 20000, shareMinor: 10000 },
    ]);
  });

  it("leaves out the adder and anyone with no share", () => {
    const out = summariseReconSplits(
      ME,
      [{ id: 10, amount: 45000 }],
      [
        { expenseId: 10, userId: ME, shareMinor: 45000 },
        { expenseId: 10, userId: SYDNEY, shareMinor: 0 },
      ]
    );
    expect(out).toEqual([]);
  });

  it("ignores a share that belongs to an expense outside the batch", () => {
    const out = summariseReconSplits(
      ME,
      [{ id: 10, amount: 45000 }],
      [
        { expenseId: 10, userId: SYDNEY, shareMinor: 22500 },
        { expenseId: 99, userId: SYDNEY, shareMinor: 99999 },
      ]
    );
    expect(out).toEqual([{ userId: SYDNEY, count: 1, totalMinor: 45000, shareMinor: 22500 }]);
  });

  it("an unsplit filing (no other participant) produces no recipients", () => {
    expect(summariseReconSplits(ME, [{ id: 10, amount: 100 }], [])).toEqual([]);
  });
});

describe("reconSplitsFiledPayload", () => {
  it("says who, how many, the total and the recipient's share", () => {
    const p = reconSplitsFiledPayload({
      adderName: "Matt",
      summary: { userId: SYDNEY, count: 5, totalMinor: 230000, shareMinor: 115000 },
    });
    expect(p.body).toContain("Matt filed 5 shared spends from the bank");
    // Through the real formatter (ZAR locale), so the test cannot drift from it.
    expect(p.body).toContain(`(${formatRand(230000)})`);
    expect(p.body).toContain(`your share is ${formatRand(115000)}`);
    expect(p.url).toBe("/splits");
  });

  it("uses the singular for one spend", () => {
    const p = reconSplitsFiledPayload({
      adderName: "Matt",
      summary: { userId: SYDNEY, count: 1, totalMinor: 100, shareMinor: 50 },
    });
    expect(p.body).toContain("filed 1 shared spend from");
    expect(p.body).not.toContain("spends");
  });

  it("is a kind the push gate lets through", () => {
    const p = reconSplitsFiledPayload({
      adderName: "Matt",
      summary: { userId: SYDNEY, count: 1, totalMinor: 100, shareMinor: 50 },
    });
    expect(p.kind).toBe("split");
    expect((PUSHABLE_KINDS as readonly string[]).includes(p.kind!)).toBe(true);
  });
});
