import { describe, it, expect } from "vitest";
import { matchRules, ruleMatches } from "@/lib/services/recon/match-rules";
import type { ReconRuleRow } from "@/lib/repositories/interfaces/recon-rule.repository";

function rule(over: Partial<ReconRuleRow> = {}): ReconRuleRow {
  return {
    id: 1,
    ownerUserId: 1,
    matchKind: "merchant_exact",
    matchValue: "checkers",
    categoryId: 10,
    categoryName: "Groceries",
    participantUserIds: [1, 2],
    timesUsed: 0,
    createdAt: "2026-01-01",
    ...over,
  };
}

function item(id: number, key: string) {
  return { id, merchantKeyNormalized: key, vendor: key };
}

describe("recon rule matching", () => {
  it("applies to the merchant it names", () => {
    expect(ruleMatches(rule(), item(1, "checkers"))).toBe(true);
    expect(ruleMatches(rule(), item(1, "CHECKERS"))).toBe(true);
  });

  it("does not apply to near-misses", () => {
    expect(ruleMatches(rule(), item(1, "checkers liquor"))).toBe(false);
    expect(ruleMatches(rule(), item(1, "checker"))).toBe(false);
    expect(ruleMatches(rule(), item(1, "woolworths"))).toBe(false);
  });

  it("contains is the escape hatch for branch codes and references", () => {
    const r = rule({ matchKind: "merchant_contains", matchValue: "shell" });
    expect(ruleMatches(r, item(1, "shell claremont 4471"))).toBe(true);
    expect(ruleMatches(r, item(1, "engen"))).toBe(false);
  });

  it("never matches on an empty needle", () => {
    expect(ruleMatches(rule({ matchValue: "  " }), item(1, "anything"))).toBe(false);
  });

  it("splits rows into rule-sorted and needs-a-decision", () => {
    const { matched, unmatched } = matchRules(
      [item(1, "checkers"), item(2, "dis-chem"), item(3, "checkers")],
      [rule()]
    );
    expect(matched.map((m) => m.item.id)).toEqual([1, 3]);
    expect(unmatched.map((u) => u.id)).toEqual([2]);
  });

  it("leaves a rule with no category to a person", () => {
    const { matched, unmatched } = matchRules([item(1, "checkers")], [rule({ categoryId: null })]);
    expect(matched).toHaveLength(0);
    expect(unmatched).toHaveLength(1);
  });

  it("resolves overlapping rules deterministically", () => {
    const exact = rule({ id: 1, matchKind: "merchant_exact", matchValue: "shell", categoryId: 10 });
    const contains = rule({ id: 2, matchKind: "merchant_contains", matchValue: "she", categoryId: 20 });
    const a = matchRules([item(1, "shell")], [exact, contains]);
    const b = matchRules([item(1, "shell")], [contains, exact]);
    expect(a.matched[0].rule.id).toBe(1);
    expect(b.matched[0].rule.id).toBe(1);
  });

  it("prefers the rule that has actually been used", () => {
    const seldom = rule({ id: 1, matchKind: "merchant_contains", matchValue: "che", categoryId: 10, timesUsed: 0 });
    const often = rule({ id: 2, matchKind: "merchant_contains", matchValue: "check", categoryId: 20, timesUsed: 9 });
    expect(matchRules([item(1, "checkers")], [seldom, often]).matched[0].rule.id).toBe(2);
  });
});
