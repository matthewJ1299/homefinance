/**
 * The user-facing taxonomy for money coming in, added by migration 0037.
 *
 * Layered on top of `income.type` ("salary" | "ad_hoc"), which is left alone:
 * that column is load-bearing for settlements -- SplitService.settle writes
 * "ad_hoc" and the settlement history reads it back.
 */
export const INCOME_KINDS = [
  { value: "salary", label: "Salary" },
  { value: "bonus", label: "Bonus" },
  { value: "interest", label: "Interest" },
  { value: "gift", label: "Gift" },
  { value: "other", label: "Other" },
] as const;

export type IncomeKind = (typeof INCOME_KINDS)[number]["value"];

export const INCOME_KIND_VALUES = INCOME_KINDS.map((k) => k.value) as unknown as [
  IncomeKind,
  ...IncomeKind[],
];

export function isIncomeKind(value: string): value is IncomeKind {
  return INCOME_KINDS.some((k) => k.value === value);
}

export function incomeKindLabel(value: string): string {
  return INCOME_KINDS.find((k) => k.value === value)?.label ?? "Other";
}

/**
 * The legacy `type` a given kind maps to. Only a salary is a salary; everything
 * else has always been ad hoc as far as settlements are concerned.
 */
export function legacyTypeForKind(kind: IncomeKind): "salary" | "ad_hoc" {
  return kind === "salary" ? "salary" : "ad_hoc";
}
