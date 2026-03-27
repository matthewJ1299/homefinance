import { getUserRepository } from "@/lib/repositories";
import type { BudgetMonthPeriod } from "@/lib/types/budget-month";
import {
  budgetMonthKeyFromIsoDate,
  getBudgetPeriodForMonthKey,
  getCurrentBudgetMonth,
} from "@/lib/utils/date";

export async function budgetMonthKeyForUser(userId: number, date: string): Promise<string> {
  const start = await getUserRepository().getBudgetMonthStartDay(userId);
  return budgetMonthKeyFromIsoDate(date, start);
}

export async function getDefaultBudgetMonthForUser(userId: number): Promise<string> {
  const start = await getUserRepository().getBudgetMonthStartDay(userId);
  return getCurrentBudgetMonth(start);
}

export async function getBudgetPeriodForUserMonth(month: string, userId: number): Promise<BudgetMonthPeriod> {
  const start = await getUserRepository().getBudgetMonthStartDay(userId);
  return getBudgetPeriodForMonthKey(month, start);
}
