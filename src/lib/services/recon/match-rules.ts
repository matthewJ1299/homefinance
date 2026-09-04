import type { ReconRuleRow } from "@/lib/repositories/interfaces/recon-rule.repository";

export interface MatchableItem {
  id: number;
  merchantKeyNormalized: string;
  vendor: string;
}

export interface RuleMatch<T extends MatchableItem> {
  item: T;
  rule: ReconRuleRow;
}

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Applies a rule to a row.
 *
 * `merchant_exact` is the whole key, so "Checkers" never claims "Checkers
 * Liquor". `merchant_contains` is the escape hatch for merchants whose
 * statement text carries a branch or a reference number, and it needs a
 * non-empty needle or it would match everything.
 */
export function ruleMatches(rule: ReconRuleRow, item: MatchableItem): boolean {
  const needle = normalise(rule.matchValue);
  if (needle === "") return false;
  const key = normalise(item.merchantKeyNormalized || item.vendor);
  return rule.matchKind === "merchant_exact" ? key === needle : key.includes(needle);
}

/**
 * Splits rows into the ones a rule has already decided and the ones that still
 * need a person.
 *
 * The most-used rule wins a tie, then the most specific: an exact match beats a
 * contains, and a longer needle beats a shorter one. Without a deterministic
 * order, two overlapping rules would sort the same merchant differently on
 * different days.
 */
export function matchRules<T extends MatchableItem>(
  items: T[],
  rules: ReconRuleRow[]
): { matched: RuleMatch<T>[]; unmatched: T[] } {
  const ordered = [...rules].sort((a, b) => {
    if (b.timesUsed !== a.timesUsed) return b.timesUsed - a.timesUsed;
    if (a.matchKind !== b.matchKind) return a.matchKind === "merchant_exact" ? -1 : 1;
    if (b.matchValue.length !== a.matchValue.length) return b.matchValue.length - a.matchValue.length;
    return a.id - b.id;
  });

  const matched: RuleMatch<T>[] = [];
  const unmatched: T[] = [];
  for (const item of items) {
    const rule = ordered.find((r) => ruleMatches(r, item));
    if (rule && rule.categoryId != null) matched.push({ item, rule });
    else unmatched.push(item);
  }
  return { matched, unmatched };
}
