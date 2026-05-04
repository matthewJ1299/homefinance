import type { IncomeEntry } from "@/lib/repositories/interfaces/income.repository";
import type { ExpenseWithDetails } from "@/lib/types";

export type MergedDayRow =
  | { kind: "expense"; expense: ExpenseWithDetails }
  | { kind: "income"; income: IncomeEntry };

export interface RecentMergedByDateResult {
  byDate: Record<string, MergedDayRow[]>;
  dates: string[];
  incomeSumMinor: number;
  expenseSumMinor: number;
}

/**
 * Builds a date-grouped slice of expenses + income for the dashboard transactions tile,
 * newest-first, optionally filtered to the primary account.
 */
export function buildRecentMergedByDate(
  expenses: ExpenseWithDetails[],
  incomes: IncomeEntry[],
  primaryAccountId: number | null | undefined,
  limit: number
): RecentMergedByDateResult {
  const expFiltered =
    primaryAccountId != null && primaryAccountId > 0
      ? expenses.filter((e) => e.accountId != null && Number(e.accountId) === primaryAccountId)
      : expenses;
  const incFiltered =
    primaryAccountId != null && primaryAccountId > 0
      ? incomes.filter((i) => i.accountId != null && Number(i.accountId) === primaryAccountId)
      : incomes;

  type SortRow = { date: string; sortKey: number; row: MergedDayRow };
  const merged: SortRow[] = [];
  for (const e of expFiltered) {
    merged.push({ date: e.date, sortKey: e.id, row: { kind: "expense", expense: e } });
  }
  for (const i of incFiltered) {
    merged.push({ date: i.date, sortKey: i.id, row: { kind: "income", income: i } });
  }
  merged.sort((a, b) => b.date.localeCompare(a.date) || b.sortKey - a.sortKey);
  const slice = merged.slice(0, Math.max(0, limit));

  let incomeSumMinor = 0;
  let expenseSumMinor = 0;
  const byDate: Record<string, MergedDayRow[]> = {};
  for (const x of slice) {
    if (x.row.kind === "income") incomeSumMinor += x.row.income.amount;
    else expenseSumMinor += x.row.expense.amount;
    (byDate[x.date] ??= []).push(x.row);
  }
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
  return { byDate, dates, incomeSumMinor, expenseSumMinor };
}
