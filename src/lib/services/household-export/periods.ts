import type { BudgetMonthPeriod } from "@/lib/types/budget-month";
import { formatBudgetMonthLabel, getBudgetPeriodForMonthKey, prevMonth } from "@/lib/utils/date";

/** One budget month as the export describes it. */
export interface ExportBudgetMonth extends BudgetMonthPeriod {
  /** yyyy-MM budget month key. */
  key: string;
  /** Human label, e.g. "25 Aug - 24 Sep 2025". */
  label: string;
}

/**
 * The `count` budget month keys ending at `currentMonth`, oldest first.
 *
 * "Last 3 months" means the current budget month and the two before it, not
 * three calendar months: the caller passes the current *budget* month key.
 */
export function lastBudgetMonthKeys(currentMonth: string, count: number): string[] {
  if (!Number.isInteger(count) || count < 1) return [];
  const keys: string[] = [currentMonth];
  while (keys.length < count) keys.unshift(prevMonth(keys[0]));
  return keys;
}

/** Date windows for each month key, in the order given. */
export function budgetMonthWindows(monthKeys: string[], startDay: number): ExportBudgetMonth[] {
  return monthKeys.map((key) => ({
    key,
    label: formatBudgetMonthLabel(key, startDay),
    ...getBudgetPeriodForMonthKey(key, startDay),
  }));
}

/**
 * The single contiguous window covering every budget month listed, so each
 * table is read once and rows are assigned to a month afterwards.
 */
export function spanOfWindows(windows: ExportBudgetMonth[]): BudgetMonthPeriod {
  if (windows.length === 0) throw new Error("No budget months to export");
  const starts = windows.map((w) => w.start).sort();
  const ends = windows.map((w) => w.end).sort();
  return { start: starts[0], end: ends[ends.length - 1] };
}

export function exportFilename(span: BudgetMonthPeriod): string {
  return `homefinance-export-${span.start}-to-${span.end}.json`;
}
