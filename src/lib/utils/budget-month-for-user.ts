import { getHouseholdRepository, getUserRepository } from "@/lib/repositories";
import { getRequestContext, memoiseBudgetMonthStartDay } from "@/lib/db/request-context";
import type { BudgetMonthPeriod } from "@/lib/types/budget-month";
import {
  budgetMonthKeyFromIsoDate,
  getBudgetPeriodForMonthKey,
  getCurrentBudgetMonth,
} from "@/lib/utils/date";

/**
 * The budget month start day, now a household setting (migration 0042).
 *
 * Two people looking at different budget months is the bug this fixes: every
 * shared figure -- splits, the mortgage share, a shared account's rows -- was
 * being framed by two different windows at once.
 *
 * `users.budget_month_start_day` is left in place and unread for one release,
 * which is what makes the migration reversible. It is only consulted here if
 * the household somehow has no day of its own.
 *
 * This is the one place the start day is resolved. Everything that needs a raw
 * day number calls this -- reading `users.budget_month_start_day` directly is
 * what put two people in two different months.
 */
export async function budgetMonthStartDayForUser(userId: number): Promise<number> {
  // Constant for the request, and reached from a dozen places per render.
  // Memoised on the request context, which covers RSC render trees, route
  // handlers, server actions and background jobs alike -- a bare React
  // `cache()` would only cover the first of those.
  const memoised = getRequestContext()?.budgetMonthStartDay;
  if (memoised != null && memoised > 0) return memoised;

  let resolved: number | null = null;
  try {
    const fromHousehold = await getHouseholdRepository().getBudgetMonthStartDay();
    if (fromHousehold > 0) resolved = fromHousehold;
  } catch {
    // The household lookup is tenant-scoped and throws without request
    // context; the per-user column is not. Falling back keeps every caller
    // that worked before this moved -- and this is precisely what leaving that
    // column readable for one release is for.
  }
  if (resolved == null) {
    resolved = await getUserRepository().getBudgetMonthStartDay(userId);
  }
  memoiseBudgetMonthStartDay(resolved);
  return resolved;
}

const startDayForUser = budgetMonthStartDayForUser;

export async function budgetMonthKeyForUser(userId: number, date: string): Promise<string> {
  return budgetMonthKeyFromIsoDate(date, await startDayForUser(userId));
}

export async function getDefaultBudgetMonthForUser(userId: number): Promise<string> {
  return getCurrentBudgetMonth(await startDayForUser(userId));
}

export async function getBudgetPeriodForUserMonth(
  month: string,
  userId: number
): Promise<BudgetMonthPeriod> {
  return getBudgetPeriodForMonthKey(month, await startDayForUser(userId));
}
