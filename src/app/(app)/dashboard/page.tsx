import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { getAccountRepository, getCategoryRepository, getUserRepository, getSplitGroupRepository } from "@/lib/repositories";
import { BudgetService } from "@/lib/services/budget.service";
import { isAIConfigured } from "@/lib/services/ai.service";
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
import { AiAnalysisButton } from "@/components/dashboard/ai-analysis-button";
import { BudgetWarningTile } from "@/components/dashboard/budget-warning-tile";
import { PopulateMonthButton } from "@/components/dashboard/populate-month-button";
import { TodayCalendarTile } from "@/components/dashboard/today-calendar-tile";
import { AccountsSummaryTile } from "@/components/dashboard/accounts-summary-tile";
import { DashboardAccountFilter } from "@/components/dashboard/dashboard-account-filter";
import { WhenDashboardTileEnabled } from "@/components/dashboard/when-dashboard-tile-enabled";
import { GoalsSummaryTile } from "@/components/dashboard/goals-summary-tile";
import { CreditSummaryTile } from "@/components/dashboard/credit-summary-tile";
import { GoalAlertsTile } from "@/components/dashboard/goal-alerts-tile";
import { formatRand } from "@/lib/utils/currency";
import Link from "next/link";
import { Suspense } from "react";

const EXPENSE_PAGE_SIZE = 15;

interface DashboardPageProps {
  searchParams: Promise<{ month?: string; page?: string; account?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = Number(session.user.id);
  const { month: monthParam, page: pageParam, account: accountParam } = await searchParams;
  const month = monthParam ?? getCurrentMonth();
  const page = Math.max(1, parseInt(String(pageParam ?? "1"), 10) || 1);
  const accountId =
    accountParam == null || accountParam === "all" || accountParam === ""
      ? undefined
      : parseInt(accountParam, 10);
  const accountFilter = Number.isNaN(accountId) ? undefined : accountId;

  const categoryRepo = getCategoryRepository();
  const userRepo = getUserRepository();
  const splitGroupRepo = getSplitGroupRepository();
  const accountRepo = getAccountRepository();
  const expenseService = new ExpenseService();
  const incomeService = new IncomeService();
  const calendarService = new CalendarService();
  const today = format(new Date(), "yyyy-MM-dd");
  const budgetService = new BudgetService();
  const [categories, otherUsers, splitGroups, accounts, expensePage, incomeResult, splitBalance, todayEvents, budgetOverview] = await Promise.all([
    categoryRepo.findAll(),
    userRepo.findAllExcept(userId),
    splitGroupRepo.findAll(),
    accountRepo.findAllForUser(userId),
    expenseService.getByMonthPaginated(month, page, EXPENSE_PAGE_SIZE, userId, accountFilter),
    incomeService.getByMonth(month, userId, accountFilter),
    new SplitService().getBalance(userId),
    calendarService.getByDateRange(today, today),
    budgetService.getOverview(month, userId),
  ]);
  const overspentCategories = budgetOverview.categories.filter((c) => c.isOverspent);
  const budgetByCategory = new Map(
    budgetOverview.categories.map((c) => [c.categoryId, { remaining: c.remaining, isOverspent: c.isOverspent }])
  );
  const otherUserName = otherUsers[0]?.name;

  const accountOptions = accounts.map((a) => ({ id: a.id, name: a.name, type: a.type }));

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MonthNavigator />
        <Suspense fallback={<span className="text-sm text-muted-foreground">Account: ...</span>}>
          <DashboardAccountFilter accounts={accountOptions} />
        </Suspense>
      </div>
      <WhenDashboardTileEnabled tile="quickAdd">
        <section>
          <h2 className="sr-only">Quick add expense</h2>
          <QuickAddForm
            categories={categories}
            userId={userId}
            otherUserName={otherUserName}
            splitGroups={splitGroups}
            budgetByCategory={budgetByCategory}
          />
        </section>
      </WhenDashboardTileEnabled>
      <section className="max-w-xs space-y-3">
        <WhenDashboardTileEnabled tile="accounts">
          <AccountsSummaryTile />
        </WhenDashboardTileEnabled>
        <WhenDashboardTileEnabled tile="goalsSummary">
          <GoalsSummaryTile month={month} />
        </WhenDashboardTileEnabled>
        <WhenDashboardTileEnabled tile="creditSummary">
          <CreditSummaryTile />
        </WhenDashboardTileEnabled>
        <WhenDashboardTileEnabled tile="today">
          <TodayCalendarTile occurrences={todayEvents} />
        </WhenDashboardTileEnabled>
      </section>
      <WhenDashboardTileEnabled tile="goalAlerts">
        <GoalAlertsTile month={month} />
      </WhenDashboardTileEnabled>
      {splitBalance.net !== 0 && (
        <WhenDashboardTileEnabled tile="splitBalance">
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
        </WhenDashboardTileEnabled>
      )}
      <WhenDashboardTileEnabled tile="budgetWarning">
        <BudgetWarningTile overspentCategories={overspentCategories} />
      </WhenDashboardTileEnabled>
      <WhenDashboardTileEnabled tile="aiAnalysis">
        <AiAnalysisButton month={month} enabled={isAIConfigured()} />
      </WhenDashboardTileEnabled>
      <WhenDashboardTileEnabled tile="recentExpenses">
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
            account={accountParam ?? undefined}
          />
        </CollapsibleSection>
      </WhenDashboardTileEnabled>
      <WhenDashboardTileEnabled tile="incomeSection">
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
      </WhenDashboardTileEnabled>
      <WhenDashboardTileEnabled tile="populateMonth">
        <section className="flex flex-wrap items-center gap-3">
          <PopulateMonthButton month={month} />
        </section>
      </WhenDashboardTileEnabled>
    </div>
  );
}
