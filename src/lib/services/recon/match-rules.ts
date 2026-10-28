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

/** A rule can act on a row only once it is complete: a file rule needs a
 * category, an ignore rule needs nothing more than its match. */
function ruleIsActionable(rule: ReconRuleRow): boolean {
  return rule.action === "ignore" || rule.categoryId != null;
}

/**
 * Splits rows into the ones a rule has already decided and the ones that still
 * need a person. Rules come in two kinds: `matched` are file rules that will
 * place the row, `ignoreMatched` are ignore rules that will drop it. A file
 * rule with no category yet is not actionable and leaves its row for a person.
 *
 * The most-used rule wins a tie, then the most specific: an exact match beats a
 * contains, and a longer needle beats a shorter one. Without a deterministic
 * order, two overlapping rules would sort the same merchant differently on
 * different days.
 */
export function matchRules<T extends MatchableItem>(
  items: T[],
  rules: ReconRuleRow[]
): { matched: RuleMatch<T>[]; ignoreMatched: RuleMatch<T>[]; unmatched: T[] } {
  const ordered = [...rules].sort((a, b) => {
    if (b.timesUsed !== a.timesUsed) return b.timesUsed - a.timesUsed;
    if (a.matchKind !== b.matchKind) return a.matchKind === "merchant_exact" ? -1 : 1;
    if (b.matchValue.length !== a.matchValue.length) return b.matchValue.length - a.matchValue.length;
    return a.id - b.id;
  });

  const matched: RuleMatch<T>[] = [];
  const ignoreMatched: RuleMatch<T>[] = [];
  const unmatched: T[] = [];
  for (const item of items) {
    const rule = ordered.find((r) => ruleMatches(r, item) && ruleIsActionable(r));
    if (!rule) {
      unmatched.push(item);
    } else if (rule.action === "ignore") {
      ignoreMatched.push({ item, rule });
    } else {
      matched.push({ item, rule });
    }
  }
  return { matched, ignoreMatched, unmatched };
}
