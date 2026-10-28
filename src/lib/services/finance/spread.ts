/**
 * The pure distribution behind "Spread it for me": splits a remainder (in cents)
 * across recipient categories, weighted by recent spending, with no I/O. Kept
 * apart from `BudgetService` so the rounding -- floor each share, then hand the
 * leftover cents to the heaviest weights first -- can be unit-tested directly.
 */

export interface SpreadIncrement {
  categoryId: number;
  /** Whole cents added to this category. Always > 0. */
  increment: number;
}

/**
 * @param recipientIds category ids to spread across (order is not significant)
 * @param historicalByCategory recent spend per category, the weighting source
 * @param remainder the unassigned cents to distribute (assumed > 0)
 * @returns increments (only categories getting > 0), heaviest weight first, and
 *          whether real history drove the weights (false = even split)
 */
export function computeSpreadIncrements(
  recipientIds: number[],
  historicalByCategory: Record<number, number>,
  remainder: number
): { increments: SpreadIncrement[]; weightedByHistory: boolean } {
  if (recipientIds.length === 0 || remainder <= 0) {
    return { increments: [], weightedByHistory: false };
  }

  const totalHistorical = recipientIds.reduce(
    (sum, id) => sum + (historicalByCategory[id] ?? 0),
    0
  );
  const weightedByHistory = totalHistorical > 0;

  const weights = recipientIds.map((categoryId) => ({
    categoryId,
    weight: weightedByHistory
      ? (historicalByCategory[categoryId] ?? 0) / totalHistorical
      : 1 / recipientIds.length,
  }));

  const raw = new Map<number, number>();
  let distributed = 0;
  const ordered = [...weights].sort((a, b) => b.weight - a.weight);
  for (const { categoryId, weight } of ordered) {
    const inc = Math.floor(weight * remainder);
    raw.set(categoryId, inc);
    distributed += inc;
  }
  // Whole cents; the rounding remainder goes to the heaviest weights first.
  let leftover = remainder - distributed;
  for (const { categoryId } of ordered) {
    if (leftover <= 0) break;
    raw.set(categoryId, (raw.get(categoryId) ?? 0) + 1);
    leftover -= 1;
  }

  const increments: SpreadIncrement[] = [];
  for (const { categoryId } of ordered) {
    const increment = raw.get(categoryId) ?? 0;
    if (increment > 0) increments.push({ categoryId, increment });
  }
  return { increments, weightedByHistory };
}
