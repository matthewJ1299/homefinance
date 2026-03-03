import { auth } from "@/lib/auth";
import { getCategoryRepository } from "@/lib/repositories";
import { ExpenseService } from "@/lib/services/expense.service";
import { IncomeService } from "@/lib/services/income.service";
import { getCurrentMonth } from "@/lib/utils/date";
import { MonthNavigator } from "@/components/layout/month-navigator";
import { QuickAddForm } from "@/components/expenses/quick-add-form";
import { ExpenseList } from "@/components/expenses/expense-list";
import { ExpenseListPagination } from "@/components/expenses/expense-list-pagination";
import { IncomeQuickAdd } from "@/components/income/income-quick-add";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { formatRand } from "@/lib/utils/currency";

const EXPENSE_PAGE_SIZE = 15;

interface DashboardPageProps {
  searchParams: Promise<{ month?: string; page?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = Number(session.user.id);
  const { month: monthParam, page: pageParam } = await searchParams;
  const month = monthParam ?? getCurrentMonth();
  const page = Math.max(1, parseInt(String(pageParam ?? "1"), 10) || 1);

  const categoryRepo = getCategoryRepository();
  const expenseService = new ExpenseService();
  const incomeService = new IncomeService();
  const [categories, expensePage, incomeResult] = await Promise.all([
    categoryRepo.findAll(),
    expenseService.getByMonthPaginated(month, page, EXPENSE_PAGE_SIZE, userId),
    incomeService.getByMonth(month),
  ]);

  return (
    <div className="p-4 space-y-6">
      <MonthNavigator />
      <section>
        <h2 className="sr-only">Quick add expense</h2>
        <QuickAddForm categories={categories} userId={userId} />
      </section>
      <CollapsibleSection title="Recent expenses" defaultOpen>
        <ExpenseList expenses={expensePage.expenses} />
        <ExpenseListPagination
          month={month}
          page={expensePage.page}
          totalPages={expensePage.totalPages}
          total={expensePage.total}
          pageSize={EXPENSE_PAGE_SIZE}
        />
      </CollapsibleSection>
      <CollapsibleSection title="Income this month" defaultOpen={false}>
        <p className="text-xs text-muted-foreground mb-2">
          Total: {formatRand(incomeResult.totals.overall)}. Add income below to budget it.
        </p>
        <IncomeQuickAdd month={month} />
      </CollapsibleSection>
    </div>
  );
}
