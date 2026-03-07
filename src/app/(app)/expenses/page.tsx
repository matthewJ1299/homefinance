import { auth } from "@/lib/auth";
import { getCategoryRepository, getUserRepository } from "@/lib/repositories";
import { ExpenseService } from "@/lib/services/expense.service";
import { IncomeService } from "@/lib/services/income.service";
import { getCurrentMonth } from "@/lib/utils/date";
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
  const month = monthParam ?? getCurrentMonth();
  const initialView: ExpensesView = parseExpensesView(viewParam, currentUserId);

  const categoryRepo = getCategoryRepository();
  const userRepo = getUserRepository();
  const expenseService = new ExpenseService();
  const incomeService = new IncomeService();
  const [categories, users, expenseResult, incomeResult] = await Promise.all([
    categoryRepo.findAll(),
    userRepo.findAll(),
    expenseService.getByMonth(month),
    incomeService.getByMonth(month),
  ]);

  return (
    <div className="p-4 space-y-6">
      <MonthNavigator />
      <ExpensesPageClient
        month={month}
        currentUserId={currentUserId}
        users={users}
        categories={categories}
        expenses={expenseResult.expenses}
        incomeEntries={incomeResult.entries}
        initialView={initialView}
      />
    </div>
  );
}
