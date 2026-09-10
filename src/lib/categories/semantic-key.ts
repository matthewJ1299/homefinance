/**
 * Stable identities for the handful of categories the app behaves differently
 * around.
 *
 * These used to be matched on the display name -- `category.name === "Splits"`
 * routed a spend into settlement logic, `name.toLowerCase() === "mortgage"`
 * recorded a bond payment. Categories are user-editable, so renaming "Splits"
 * to "Shared" silently disabled settlement handling: no error, the spend just
 * became an ordinary expense.
 *
 * `categories.semantic_key` (migration 0047) carries the identity; the name
 * stays free for the user to change.
 */
export const CATEGORY_SEMANTIC_KEYS = ["splits", "mortgage", "unaccounted"] as const;

export type CategorySemanticKey = (typeof CATEGORY_SEMANTIC_KEYS)[number];

/**
 * The name migration 0047 backfilled each key from, and the name a household
 * gets when the category is seeded.
 */
export const SEMANTIC_KEY_DEFAULT_NAME: Readonly<Record<CategorySemanticKey, string>> = {
  splits: "Splits",
  mortgage: "Mortgage",
  unaccounted: "Unaccounted",
};

export function isCategorySemanticKey(value: unknown): value is CategorySemanticKey {
  return (
    typeof value === "string" &&
    (CATEGORY_SEMANTIC_KEYS as readonly string[]).includes(value)
  );
}

/**
 * Does this category carry `key`?
 *
 * Falls back to the old name comparison when `semantic_key` is NULL, so a row
 * the backfill could not reach -- created between the migration and a deploy,
 * or renamed away and back -- still behaves as it did before. Rows written from
 * here on always carry the key, so the fallback is a bridge, not the mechanism.
 */
export function categoryHasSemanticKey(
  category: { name: string; semanticKey?: string | null },
  key: CategorySemanticKey
): boolean {
  if (category.semanticKey != null) return category.semanticKey === key;
  return category.name.trim().toLowerCase() === SEMANTIC_KEY_DEFAULT_NAME[key].toLowerCase();
}
