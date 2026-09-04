/**
 * A goal is a category with a target and a date.
 *
 * Money in a goal is money assigned like any other, so the envelope model does
 * the arithmetic and there is exactly one way to move money into it. Everything
 * here is derived from figures the budget already has -- nothing is stored
 * twice, and nothing can drift out of step with the category it describes.
 */
export interface GoalCategoryInput {
  categoryId: number;
  categoryName: string;
  /** assigned + carried in - spent: what is actually saved so far. */
  available: number;
  /** Assigned this month. */
  assigned: number;
  targetMinor: number | null;
  /** yyyy-MM-dd. */
  targetDate: string | null;
}

export interface GoalCategoryRow extends GoalCategoryInput {
  targetMinor: number;
  /** Whole months from the current month to the target, at least 1. */
  monthsLeft: number | null;
  /** What has to go in each month from here to land on the target in time. */
  monthlyNeeded: number;
  /** Whether this month's assignment covers that. */
  onTrack: boolean;
  /** Positive when this month is short of `monthlyNeeded`. */
  shortfall: number;
  /** 0-1. Clamped, because over-saving is not 130% of a goal. */
  progress: number;
}

/** Whole months between two yyyy-MM keys, floored at zero. */
export function monthsBetween(fromMonth: string, toDate: string): number {
  const [fy, fm] = fromMonth.split("-").map(Number);
  const [ty, tm] = toDate.split("-").map(Number);
  if (!fy || !fm || !ty || !tm) return 0;
  return Math.max(0, (ty - fy) * 12 + (tm - fm));
}

export function buildGoalRows(
  categories: GoalCategoryInput[],
  currentMonth: string
): GoalCategoryRow[] {
  return categories
    .filter((c): c is GoalCategoryInput & { targetMinor: number } => c.targetMinor != null)
    .map((c) => {
      const remaining = Math.max(0, c.targetMinor - c.available);
      // Inclusive of this month: a target dated this month still has one month
      // to be met in, not zero.
      const monthsLeft = c.targetDate ? monthsBetween(currentMonth, c.targetDate) + 1 : null;
      const monthlyNeeded =
        monthsLeft != null && monthsLeft > 0
          ? Math.ceil(remaining / monthsLeft)
          : remaining;
      return {
        ...c,
        monthsLeft,
        monthlyNeeded,
        onTrack: remaining === 0 || c.assigned >= monthlyNeeded,
        shortfall: Math.max(0, monthlyNeeded - c.assigned),
        progress:
          c.targetMinor > 0 ? Math.min(1, Math.max(0, c.available / c.targetMinor)) : 0,
      };
    });
}

/**
 * Goals behind plan, for Home's needs-you stream.
 *
 * Computed from the same figures the Goals page shows, not from a separate
 * table -- two sources for one number is how they end up disagreeing.
 */
export function goalsBehind(rows: GoalCategoryRow[]): Array<{ name: string; shortfall: number }> {
  return rows
    .filter((r) => !r.onTrack && r.shortfall > 0)
    .sort((a, b) => b.shortfall - a.shortfall)
    .map((r) => ({ name: r.categoryName, shortfall: r.shortfall }));
}
