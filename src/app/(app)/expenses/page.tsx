import { auth } from "@/lib/auth";
import { getCategoryRepository, getUserRepository, getSplitGroupRepository } from "@/lib/repositories";
import { ExpenseService } from "@/lib/services/expense.service";
import { IncomeService } from "@/lib/services/income.service";
import { getDefaultBudgetMonthForUser } from "@/lib/utils/budget-month-for-user";
import { MonthNavigator } from "@/components/layout/month-navigator";
import { ExpensesPageClient } from "@/components/expenses/expenses-page-client";
import { parseExpensesView, type ExpensesView } from "@/lib/utils/expenses-view";

interface ExpensesPageProps {
  searchParams: Promise<{ month?: string; view?: string }>;
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const currentUserId = Number(session.user.id);
  const { month: monthParam, view: viewParam } = await searchParams;
  const month = monthParam ?? (await getDefaultBudgetMonthForUser(currentUserId));
  const initialView: ExpensesView = parseExpensesView(viewParam, currentUserId);

  const categoryRepo = getCategoryRepository();
  const userRepo = getUserRepository();
  const splitGroupRepo = getSplitGroupRepository();
  const expenseService = new ExpenseService();
  const incomeService = new IncomeService();
  const [categories, users, splitGroups, expenseResult, incomeResult] = await Promise.all([
    categoryRepo.findAll(),
    userRepo.findAll(),
    splitGroupRepo.findAll(),
    expenseService.getByMonth(month, currentUserId),
    incomeService.getByMonth(month, currentUserId),
  ]);

  return (
    <div className="p-4 space-y-6">
      <MonthNavigator />
      <ExpensesPageClient
        month={month}
        currentUserId={currentUserId}
        users={users}
        categories={categories}
        splitGroups={splitGroups}
        expenses={expenseResult.expenses}
        incomeEntries={incomeResult.entries}
        initialView={initialView}
      />
    </div>
  );
}
