import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { getCategoryRepository, getUserRepository, getSplitGroupRepository } from "@/lib/repositories";
import { CalendarService } from "@/lib/services/calendar.service";
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
import { PopulateMonthButton } from "@/components/dashboard/populate-month-button";
import { TodayCalendarTile } from "@/components/dashboard/today-calendar-tile";
import { formatRand } from "@/lib/utils/currency";
import Link from "next/link";

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
  const userRepo = getUserRepository();
  const splitGroupRepo = getSplitGroupRepository();
  const expenseService = new ExpenseService();
  const incomeService = new IncomeService();
  const calendarService = new CalendarService();
  const today = format(new Date(), "yyyy-MM-dd");
  const [categories, otherUsers, splitGroups, expensePage, incomeResult, splitBalance, todayEvents] = await Promise.all([
    categoryRepo.findAll(),
    userRepo.findAllExcept(userId),
    splitGroupRepo.findAll(),
    expenseService.getByMonthPaginated(month, page, EXPENSE_PAGE_SIZE, userId),
    incomeService.getByMonth(month, userId),
    new SplitService().getBalance(userId),
    calendarService.getByDateRange(today, today),
  ]);
  const otherUserName = otherUsers[0]?.name;

  return (
    <div className="p-4 space-y-6">
      <MonthNavigator />
      <section className="flex flex-wrap items-center gap-3">
        <PopulateMonthButton month={month} />
        <span className="text-xs text-muted-foreground">
          <Link href="/settings" className="underline hover:no-underline">Settings</Link>
        </span>
      </section>
      <section className="max-w-xs">
        <TodayCalendarTile occurrences={todayEvents} />
      </section>
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
        <QuickAddForm categories={categories} userId={userId} otherUserName={otherUserName} splitGroups={splitGroups} />
      </section>
      <CollapsibleSection title="Recent expenses" defaultOpen>
        <ExpenseList
          expenses={expensePage.expenses}
          categories={categories}
          otherUserName={otherUserName}
        />
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
