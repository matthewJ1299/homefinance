import { describe, it, expect } from "vitest";
import { splitAddedPayload, splitPushRecipients } from "@/lib/push/split-notification";
import { PUSHABLE_KINDS } from "@/lib/services/notification.service";
import { formatRand } from "@/lib/utils/currency";

describe("splitPushRecipients", () => {
  it("tells everyone else in the split, not the person who saved it", () => {
    const out = splitPushRecipients(1, [
      { userId: 1, shareMinor: 22500 },
      { userId: 2, shareMinor: 22500 },
    ]);
    expect(out.map((p) => p.userId)).toEqual([2]);
  });

  it("skips a participant with no share -- they were not really in on it", () => {
    const out = splitPushRecipients(1, [
      { userId: 1, shareMinor: 45000 },
      { userId: 2, shareMinor: 0 },
      { userId: 3, shareMinor: 15000 },
    ]);
    expect(out.map((p) => p.userId)).toEqual([3]);
  });

  it("a solo spend (one-person list) notifies nobody", () => {
    expect(splitPushRecipients(1, [{ userId: 1, shareMinor: 45000 }])).toEqual([]);
  });
});

describe("splitAddedPayload", () => {
  it("names the adder, the note, the total and the recipient's own share", () => {
    const p = splitAddedPayload({
      adderName: "Matt",
      amountMinor: 45000,
      note: "Woolworths",
      shareMinor: 22500,
    });
    expect(p.body).toContain("Matt added Woolworths");
    // Asserted through the real formatter (ZAR locale: "R 450,00"), so the test
    // cannot drift from what the app actually renders.
    expect(p.body).toContain(`(${formatRand(45000)})`);
    expect(p.body).toContain(`your share is ${formatRand(22500)}`);
    expect(p.url).toBe("/splits");
  });

  it("falls back to 'a shared spend' when there is no note", () => {
    const p = splitAddedPayload({ adderName: "Matt", amountMinor: 45000, note: "  ", shareMinor: 22500 });
    expect(p.body).toContain("Matt added a shared spend");
  });

  it("is a kind the push gate lets through", () => {
    const p = splitAddedPayload({ adderName: "Matt", amountMinor: 100, note: null, shareMinor: 50 });
    expect(p.kind).toBe("split");
    expect((PUSHABLE_KINDS as readonly string[]).includes(p.kind!)).toBe(true);
  });
});
