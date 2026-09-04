import "server-only";

import { BudgetService } from "@/lib/services/budget.service";
import { ExpenseService } from "@/lib/services/expense.service";
import { AccountService } from "@/lib/services/account.service";
import { getUserRepository } from "@/lib/repositories";
import { getDefaultBudgetMonthForUser, getBudgetPeriodForUserMonth } from "@/lib/utils/budget-month-for-user";
import { pickQuickAddDateForBudgetPeriod } from "@/lib/utils/date";
import type { HouseholdMember } from "@/lib/types/household-member";
import type { AddSheetCategory } from "./add-sheet";

export interface AddSheetData {
  me: HouseholdMember;
  members: HouseholdMember[];
  categories: AddSheetCategory[];
  accounts: { id: number; name: string }[];
  defaultAccountId?: number;
  defaultDate: string;
}

/**
 * Everything the Add sheet needs, loaded once in the shell so the centre button
 * opens instantly rather than routing away and fetching.
 *
 * Categories carry `available`, which is the whole reason the pills are worth
 * showing: the budget consequence has to be on screen before the save.
 */
export async function loadAddSheetData(userId: number, userName: string): Promise<AddSheetData | null> {
  const userRepo = getUserRepository();
  const month = await getDefaultBudgetMonthForUser(userId);

  const [overview, useCounts, others, accountsResult, period] = await Promise.all([
    new BudgetService().getOverview(month, userId),
    new ExpenseService().getUsageCountsByCategory(userId),
    userRepo.findAllExcept(userId),
    new AccountService().listAccountsForUser(userId),
    getBudgetPeriodForUserMonth(month, userId),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return {
    me: { id: userId, name: userName },
    members: others.map((u) => ({ id: u.id, name: u.name })),
    categories: overview.categories.map((c) => ({
      id: c.categoryId,
      name: c.categoryName,
      groupName: c.groupName,
      available: c.available,
      useCount: useCounts[c.categoryId] ?? 0,
    })),
    accounts: accountsResult.accounts.map((a) => ({ id: a.id, name: a.name })),
    defaultAccountId: accountsResult.primaryAccountId ?? undefined,
    // A spend typed on the 2nd belongs to the budget month that is open, not
    // whichever calendar month today happens to fall in.
    defaultDate: pickQuickAddDateForBudgetPeriod(today, period),
  };
}
