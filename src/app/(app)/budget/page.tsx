import type { HouseholdMember } from "@/lib/types/household-member";
import { auth } from "@/lib/auth";
import { BudgetService } from "@/lib/services/budget.service";
import { ExpenseService } from "@/lib/services/expense.service";
import { getCategoryRepository, getUserRepository } from "@/lib/repositories";
import { getDefaultBudgetMonthForUser } from "@/lib/utils/budget-month-for-user";
import { getBudgetRepository } from "@/lib/repositories";
import { prevMonth } from "@/lib/utils/date";
import { MonthNavigator } from "@/components/layout/month-navigator";
import { BudgetOverview } from "@/components/budget/budget-overview";

const MONTH_TX_FETCH = 200;

interface BudgetPageProps {
  searchParams: Promise<{ month?: string; cover?: string }>;
}

export default async function BudgetPage({ searchParams }: BudgetPageProps) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = Number(session.user.id);
  const { month: monthParam, cover } = await searchParams;
  const month = monthParam ?? (await getDefaultBudgetMonthForUser(userId));

  const service = new BudgetService();
  const expenseService = new ExpenseService();

  const [overview, expenseCategories, expensePage, otherUsers, priorAllocations] =
    await Promise.all([
      service.getOverview(month, userId),
      getCategoryRepository().findAll(),
      // The sheet lists the category's own transactions, so fetch the month
      // rather than the eight most recent.
      expenseService.getByMonthPaginated(month, 1, MONTH_TX_FETCH, userId),
      getUserRepository().findAllExcept(userId),
      getBudgetRepository().getAllocationsForMonth(prevMonth(month), userId),
    ]);
  const members: HouseholdMember[] = otherUsers.map((u) => ({ id: u.id, name: u.name }));
  const lastMonthAssigned = Object.fromEntries(
    priorAllocations.map((a) => [a.categoryId, a.allocatedAmount])
  );

  return (
    <div className="p-4 space-y-6 pb-24 md:pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Budget</h1>
        <MonthNavigator />
      </div>
      <BudgetOverview
        data={overview}
        recentExpenses={expensePage.expenses}
        expenseCategories={expenseCategories}
        members={members}
        lastMonthAssigned={lastMonthAssigned}
        openCategoryId={cover ? Number(cover) : undefined}
      />
    </div>
  );
}
