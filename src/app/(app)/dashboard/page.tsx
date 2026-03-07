import { auth } from "@/lib/auth";
import { initDb } from "@/lib/db";
import { getCategoryRepository, getUserRepository } from "@/lib/repositories";
import { ExpenseService } from "@/lib/services/expense.service";
import { IncomeService } from "@/lib/services/income.service";
import { SplitService } from "@/lib/services/split.service";
import { getCurrentMonth } from "@/lib/utils/date";
import { MonthNavigator } from "@/components/layout/month-navigator";
import { QuickAddForm } from "@/components/expenses/quick-add-form";
import { ExpenseList } from "@/components/expenses/expense-list";
import { ExpenseListPagination } from "@/components/expenses/expense-list-pagination";
import { IncomeQuickAdd } from "@/components/income/income-quick-add";
import { IncomeList } from "@/components/income/income-list";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { formatRand } from "@/lib/utils/currency";
import Link from "next/link";

const EXPENSE_PAGE_SIZE = 15;

interface DashboardPageProps {
  searchParams: Promise<{ month?: string; page?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  await initDb();
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = Number(session.user.id);
  const { month: monthParam, page: pageParam } = await searchParams;
  const month = monthParam ?? getCurrentMonth();
  const page = Math.max(1, parseInt(String(pageParam ?? "1"), 10) || 1);

  const categoryRepo = getCategoryRepository();
  const userRepo = getUserRepository();
  const expenseService = new ExpenseService();
  const incomeService = new IncomeService();
  const [categories, otherUsers, expensePage, incomeResult, splitBalance] = await Promise.all([
    categoryRepo.findAll(),
    userRepo.findAllExcept(userId),
    expenseService.getByMonthPaginated(month, page, EXPENSE_PAGE_SIZE, userId),
    incomeService.getByMonth(month),
    new SplitService().getBalance(userId),
  ]);
  const otherUserName = otherUsers[0]?.name;

  return (
    <div className="p-4 space-y-6">
      <MonthNavigator />
      {splitBalance.net !== 0 && (
        <section>
          <Link
            href="/splits"
            className="block rounded-lg border bg-card p-3 text-sm text-card-foreground shadow-sm hover:bg-accent/50"
          >
            <span className="text-muted-foreground">Split balance: </span>
            {splitBalance.net > 0
              ? `You are owed ${formatRand(splitBalance.net)}`
              : `You owe ${formatRand(-splitBalance.net)}`}
          </Link>
        </section>
      )}
      <section>
        <h2 className="sr-only">Quick add expense</h2>
        <QuickAddForm categories={categories} userId={userId} otherUserName={otherUserName} />
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
        <div className="space-y-4">
          <IncomeList
            entries={[...incomeResult.entries].sort((a, b) => b.date.localeCompare(a.date))}
          />
          <IncomeQuickAdd month={month} />
        </div>
      </CollapsibleSection>
    </div>
  );
}
