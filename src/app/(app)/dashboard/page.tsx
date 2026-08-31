import { addDays, format } from "date-fns";
import { auth } from "@/lib/auth";
import {
  getCategoryRepository,
  getUserRepository,
  getSplitGroupRepository,
  getSharedListRepository,
  getSharedListItemRepository,
} from "@/lib/repositories";
import { BudgetService } from "@/lib/services/budget.service";
import { isAIConfiguredForTier } from "@/lib/services/ai.service";
import { resolveAiInteractiveEnabled } from "@/lib/services/feature-access.service";
import {
  CalendarService,
  type CalendarEventOccurrence,
} from "@/lib/services/calendar.service";
import { occurrenceCoversDate, occurrenceSegmentEnd } from "@/lib/utils/calendar-occurrence";
import { AccountService } from "@/lib/services/account.service";
import { ExpenseService } from "@/lib/services/expense.service";
import { IncomeService } from "@/lib/services/income.service";
import { SplitService } from "@/lib/services/split.service";
import { formatBudgetMonthLabel } from "@/lib/utils/date";
import {
  getDefaultBudgetMonthForUser,
  getBudgetPeriodForUserMonth,
} from "@/lib/utils/budget-month-for-user";
import { pickQuickAddDateForBudgetPeriod } from "@/lib/utils/date";
import { formatRand } from "@/lib/utils/currency";
import { AiAnalysisButton } from "@/components/dashboard/ai-analysis-button";
import { BudgetWarningTile } from "@/components/dashboard/budget-warning-tile";
import { TodayCalendarTile } from "@/components/dashboard/today-calendar-tile";
import { WhenDashboardTileEnabled } from "@/components/dashboard/when-dashboard-tile-enabled";
import { HomeGreetingBar } from "@/components/dashboard/home-greeting-bar";
import { SplitBalanceBanner } from "@/components/dashboard/split-balance-banner";
import { HomeStatsStrip } from "@/components/dashboard/home-stats-strip";
import { DashboardExpensesClient } from "@/components/dashboard/dashboard-expenses-client";
import { DashboardIncomeSection } from "@/components/dashboard/dashboard-income-section";

async function countOpenListTasks(): Promise<number> {
  const listRepo = getSharedListRepository();
  const itemRepo = getSharedListItemRepository();
  const lists = await listRepo.findAll();
  if (lists.length === 0) return 0;
  const nested = await Promise.all(lists.map((l) => itemRepo.findByListId(l.id)));
  return nested.flat().filter((i) => !i.completed).length;
}

/** Fetched for merging with income on the transactions tile; display count is capped in the client. */
const DASHBOARD_TRANSACTIONS_EXPENSE_FETCH = 28;
const DASHBOARD_TRANSACTIONS_DISPLAY_LIMIT = 8;

function isOccurrenceUpcoming(
  o: CalendarEventOccurrence,
  today: string,
  nowTime: string
): boolean {
  const last = occurrenceSegmentEnd(o);
  if (last < today) return false;
  if (o.date > today) return true;
  if (o.time == null || String(o.time).trim() === "") return true;
  return o.time >= nowTime;
}

interface DashboardPageProps {
  searchParams: Promise<{ month?: string; page?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = Number(session.user.id);
  const { month: monthParam } = await searchParams;
  const month = monthParam ?? (await getDefaultBudgetMonthForUser(userId));
  const today = format(new Date(), "yyyy-MM-dd");
  const budgetPeriodForQuickAdd = await getBudgetPeriodForUserMonth(month, userId);
  const quickAddExpenseDate = pickQuickAddDateForBudgetPeriod(today, budgetPeriodForQuickAdd);

  const categoryRepo = getCategoryRepository();
  const userRepo = getUserRepository();
  const splitGroupRepo = getSplitGroupRepository();
  const expenseService = new ExpenseService();
  const incomeService = new IncomeService();
  const accountService = new AccountService();
  const calendarService = new CalendarService();
  const nowTime = format(new Date(), "HH:mm");
  const nextRangeEnd = format(addDays(new Date(), 30), "yyyy-MM-dd");
  const budgetService = new BudgetService();

  const mainAccountId = await accountService.getMainAccountId(userId);

  const [
    categories,
    otherUsers,
    splitGroups,
    expensePage,
    incomeResult,
    splitBalance,
    calendarOccurrences,
    budgetOverview,
    openTaskCount,
  ] = await Promise.all([
    categoryRepo.findAll(),
    userRepo.findAllExcept(userId),
    splitGroupRepo.findAll(),
    expenseService.getByMonthPaginated(
      month,
      1,
      DASHBOARD_TRANSACTIONS_EXPENSE_FETCH,
      userId,
      mainAccountId ?? undefined
    ),
    incomeService.getByMonth(month, userId),
    new SplitService().getBalance(userId),
    calendarService.getByDateRange(today, nextRangeEnd, userId),
    budgetService.getOverview(month, userId),
    countOpenListTasks(),
  ]);

  const todayOccurrences = calendarOccurrences.filter((o) => occurrenceCoversDate(o, today));

  const nextOccurrence =
    calendarOccurrences
      .filter((o) => isOccurrenceUpcoming(o, today, nowTime))
      .sort((a, b) => {
        const c = a.date.localeCompare(b.date);
        if (c !== 0) return c;
        return (a.time ?? "").localeCompare(b.time ?? "");
      })[0] ?? null;

  const overspentCategories = budgetOverview.categories.filter((c) => c.isOverspent);
  const budgetByCategory = new Map(
    budgetOverview.categories.map((c) => [c.categoryId, { remaining: c.remaining, isOverspent: c.isOverspent }])
  );
  const otherUserName = otherUsers[0]?.name;
  const budgetMonthStartDay = await userRepo.getBudgetMonthStartDay(userId);
  const aiUsePaid = await userRepo.getAiUsePaid(userId);
  const aiConfigured = aiUsePaid ? isAIConfiguredForTier("paid") : isAIConfiguredForTier("free");
  const aiEnabled = await resolveAiInteractiveEnabled(userId, aiConfigured);
  const monthLabelPretty = formatBudgetMonthLabel(month, budgetMonthStartDay);
  return (
    <div className="p-3 sm:p-4 space-y-5 sm:space-y-6 pb-24 md:pb-6">
      <HomeGreetingBar
        month={month}
        budgetMonthStartDay={budgetMonthStartDay}
        userName={String(session.user.name ?? session.user.email ?? "")}
        otherUserName={otherUserName}
        monthBalanceCents={budgetOverview.balance}
      />

      <HomeStatsStrip
        tasksOpen={openTaskCount}
        eventsToday={todayOccurrences.length}
        budgetBalanceLabel={formatRand(budgetOverview.balance)}
      />

      <WhenDashboardTileEnabled tile="splitBalance">
        <SplitBalanceBanner splitBalance={splitBalance} otherUserName={otherUserName} />
      </WhenDashboardTileEnabled>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <WhenDashboardTileEnabled tile="budgetWarning">
          <BudgetWarningTile overspentCategories={overspentCategories} />
        </WhenDashboardTileEnabled>
        <WhenDashboardTileEnabled tile="today">
          <TodayCalendarTile todayOccurrences={todayOccurrences} nextOccurrence={nextOccurrence} />
        </WhenDashboardTileEnabled>
      </div>

      <DashboardExpensesClient
        userId={userId}
        userName={String(session.user.name ?? session.user.email ?? "")}
        month={month}
        monthLabelPretty={monthLabelPretty}
        categories={categories}
        splitGroups={splitGroups}
        otherUserName={otherUserName}
        budgetByCategory={budgetByCategory}
        primaryAccountId={mainAccountId}
        expenseDate={quickAddExpenseDate}
        initialExpenses={expensePage.expenses}
        incomeEntries={incomeResult.entries}
        mergedTransactionsDisplayLimit={DASHBOARD_TRANSACTIONS_DISPLAY_LIMIT}
      />

      <DashboardIncomeSection
        month={month}
        monthLabelPretty={monthLabelPretty}
        defaultDate={quickAddExpenseDate}
        entries={incomeResult.entries}
        total={incomeResult.totals.overall}
      />

      <DashboardIncomeSection
        month={month}
        monthLabelPretty={monthLabelPretty}
        defaultDate={quickAddExpenseDate}
        entries={incomeResult.entries}
        total={incomeResult.totals.overall}
      />

      <WhenDashboardTileEnabled tile="aiAnalysis">
        <AiAnalysisButton month={month} enabled={aiEnabled} />
      </WhenDashboardTileEnabled>
    </div>
  );
}
