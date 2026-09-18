import { redirect } from "next/navigation";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { auth } from "@/lib/auth";
import {
  getCategoryRepository,
  getUserRepository,
  getSharedListRepository,
  getSharedListItemRepository,
  getHouseholdRepository,
} from "@/lib/repositories";
import { BudgetService } from "@/lib/services/budget.service";
import { resolveAiInteractiveEnabled } from "@/lib/services/feature-access.service";
import { CalendarService } from "@/lib/services/calendar.service";
import { occurrenceCoversDate } from "@/lib/utils/calendar-occurrence";
import { AccountService } from "@/lib/services/account.service";
import { ExpenseService } from "@/lib/services/expense.service";
import { IncomeService } from "@/lib/services/income.service";
import { SplitService } from "@/lib/services/split.service";
import { buildGoalRows, goalsBehind } from "@/lib/services/finance/goal-categories";
import { formatBudgetMonthLabel } from "@/lib/utils/date";
import {
  budgetMonthStartDayForUser,
  getDefaultBudgetMonthForUser,
  getBudgetPeriodForUserMonth,
} from "@/lib/utils/budget-month-for-user";
import { soleOtherMemberName, type HouseholdMember } from "@/lib/types/household-member";
import { AiAnalysisButton } from "@/components/dashboard/ai-analysis-button";
import { WhenDashboardTileEnabled } from "@/components/dashboard/when-dashboard-tile-enabled";
import { HomeGreetingBar } from "@/components/dashboard/home-greeting-bar";
import { EnvelopeHeroSection } from "@/components/dashboard/envelope-hero-section";
import { NeedsYouStream } from "@/components/dashboard/needs-you-stream";
import { buildNeedsYou } from "@/components/dashboard/needs-you-list";
import { CategoryRemaining } from "@/components/dashboard/category-remaining";
import { DashboardExpensesClient } from "@/components/dashboard/dashboard-expenses-client";
import { SetupProgressBanner } from "@/components/onboarding/setup-progress-banner";
import { BudgetMonthNotice } from "@/components/dashboard/budget-month-notice";

/** Fetched for merging with income on the transactions tile; display count is capped in the client. */
const DASHBOARD_TRANSACTIONS_EXPENSE_FETCH = 28;
const DASHBOARD_TRANSACTIONS_DISPLAY_LIMIT = 8;

async function loadOpenTasks(): Promise<{ count: number; listName: string }> {
  const lists = await getSharedListRepository().findAll();
  if (lists.length === 0) return { count: 0, listName: "" };
  const counts = await getSharedListItemRepository().countOpenItemsByListIds(
    lists.map((l) => l.id)
  );
  let bestId: number | null = null;
  let total = 0;
  for (const [listId, n] of counts) {
    total += n;
    if (bestId == null || n > (counts.get(bestId) ?? 0)) bestId = listId;
  }
  return {
    count: total,
    listName: lists.find((l) => l.id === bestId)?.name ?? lists[0].name,
  };
}

/** How far through the budget period today is, 0-100. */
function elapsedPctFor(period: { start: string; end: string }, today: string): number {
  const total = differenceInCalendarDays(parseISO(period.end), parseISO(period.start)) + 1;
  if (total <= 0) return 0;
  const gone = differenceInCalendarDays(parseISO(today), parseISO(period.start)) + 1;
  return Math.max(0, Math.min(100, (gone / total) * 100));
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
  const period = await getBudgetPeriodForUserMonth(month, userId);

  // Onboarding is gated here for the same reason the month is, below: a
  // `redirect()` out of the shell layout into a route that shares that layout
  // leaves the client with nothing to render, so /welcome came up blank and
  // the client re-fetched it forever. Home is where every login lands.
  //
  // Read once: the progress banner further down wants the same row, and used to
  // fetch it a second time.
  const setup = await getUserRepository().getSetupWizardState(userId);
  if (session.user.householdApprovalStatus !== "pending" && setup.status === "not_started") {
    redirect("/welcome");
  }

  // The month-open gate lives here rather than in the shell.
  //
  // A layout cannot see its own pathname -- it reads an x-pathname header the
  // middleware sets -- and after the layout's own redirect that header still
  // named the page we came FROM, so /new-month failed its own exemption test
  // and redirected to itself forever. Home is where the design says this fires
  // anyway, and a page redirecting away has no such problem.
  if (monthParam == null) {
    const monthPending = await new BudgetService().needsMonthOpen(userId);
    if (monthPending) redirect("/new-month");
  }

  const userRepo = getUserRepository();
  const expenseService = new ExpenseService();
  const incomeService = new IncomeService();
  const accountService = new AccountService();
  const nextRangeEnd = format(addDays(new Date(), 30), "yyyy-MM-dd");

  const [
    categories,
    otherUsers,
    expensePage,
    incomeResult,
    balances,
    calendarOccurrences,
    budgetOverview,
    openTasks,
    accountsResult,
  ] = await Promise.all([
    getCategoryRepository().findAll(),
    userRepo.findAllExcept(userId),
    // The recent-transactions tile is a preview of the /expenses list it links
    // to: the viewer's own rows plus rows on shared accounts, across every
    // account. It used to be scoped to the main account, which hid every spend
    // filed with "No account" or on another account.
    expenseService.getByMonthPaginated(
      month,
      1,
      DASHBOARD_TRANSACTIONS_EXPENSE_FETCH,
      userId,
      undefined,
      true
    ),
    incomeService.getByMonth(month, userId),
    new SplitService().getBalances(userId),
    new CalendarService().getByDateRange(today, nextRangeEnd, userId),
    new BudgetService().getOverview(month, userId),
    loadOpenTasks(),
    accountService.listAccountsForUser(userId),
  ]);
  const household = await getHouseholdRepository().getCurrent();

  const members: HouseholdMember[] = otherUsers.map((u) => ({ id: u.id, name: u.name }));
  const otherUserName = soleOtherMemberName(members);
  const budgetMonthStartDay = await budgetMonthStartDayForUser(userId);
  const monthLabelPretty = formatBudgetMonthLabel(month, budgetMonthStartDay);

  const overspent = budgetOverview.categories.filter((c) => c.available < 0);
  const spare = [...budgetOverview.categories]
    .filter((c) => c.available > 0)
    .sort((a, b) => b.available - a.available)[0];

  const owedToYou = balances.reduce((s, b) => s + Math.max(0, b.net), 0);
  const cashOnHand = accountsResult.accounts.reduce((s, a) => s + a.balance, 0);
  // Only the negative case is a row: your share of a shared shop has already
  // left the envelope, so cash sitting *above* the envelopes is not news.
  const cashShortfall = Math.max(0, budgetOverview.envelopeLeft - cashOnHand);

  const todayOccurrences = calendarOccurrences.filter((o) => occurrenceCoversDate(o, today));

  const needsYou = buildNeedsYou({
    overspentCategories: overspent.map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      available: c.available,
    })),
    spareCategory: spare
      ? { categoryName: spare.categoryName, available: spare.available }
      : undefined,
    unassigned: budgetOverview.unassigned,
    carriedOverspend: budgetOverview.carriedOverspend,
    owedToYou: balances.map((b) => ({ userName: b.userName, net: b.net })),
    todayEvents: todayOccurrences.map((o) => ({
      id: o.eventId,
      title: o.name,
      time: o.time ?? "",
      ownerName: o.createdByName,
    })),
    openTasks,
    // Balance checks land in Phase 8; until an account carries a checked-at
    // date there is nothing honest to say here.
    uncheckedAccounts: [],
    // Derived from the same figures /goals shows, not from a separate table.
    // Two sources for one number is how they end up disagreeing.
    goalsBehind: goalsBehind(
      buildGoalRows(
        budgetOverview.categories.map((c) => {
          const meta = categories.find((x) => x.id === c.categoryId);
          return {
            categoryId: c.categoryId,
            categoryName: c.categoryName,
            available: c.available,
            assigned: c.assigned,
            targetMinor: meta?.targetMinor ?? null,
            targetDate: meta?.targetDate ?? null,
          };
        }),
        month
      )
    ),
    cashShortfall,
  });

  const daysLeft = Math.max(
    0,
    differenceInCalendarDays(parseISO(period.end), parseISO(today)) + 1
  );

  return (
    <div className="p-3 sm:p-4 space-y-5 sm:space-y-6 pb-24 md:pb-6">
      <SetupProgressBanner status={setup.status} storedStep={setup.step} />

      {household?.budgetMonthNoticePending ? (
        <BudgetMonthNotice startDay={household.budgetMonthStartDay} />
      ) : null}

      <HomeGreetingBar
        month={month}
        budgetMonthStartDay={budgetMonthStartDay}
        userName={String(session.user.name ?? session.user.email ?? "")}
        members={members}
        nowIso={new Date().toISOString()}
      />

      <EnvelopeHeroSection
        envelopeLeft={budgetOverview.envelopeLeft}
        envelopeTotal={budgetOverview.envelopeTotal}
        spent={budgetOverview.totalExpenses}
        daysLeft={daysLeft}
        periodLabel={monthLabelPretty}
        elapsedPct={elapsedPctFor(period, today)}
        figures={{
          totalAssigned: budgetOverview.totalAssigned,
          totalCarriedIn: budgetOverview.categories.reduce((s, c) => s + c.carriedIn, 0),
          envelopeTotal: budgetOverview.envelopeTotal,
          spent: budgetOverview.totalExpenses,
          envelopeLeft: budgetOverview.envelopeLeft,
          owedToYou,
          unassigned: budgetOverview.unassigned,
          owedByNames: balances.filter((b) => b.net > 0).map((b) => b.userName),
        }}
      />

      <NeedsYouStream items={needsYou} />

      <CategoryRemaining
        categories={budgetOverview.categories.map((c) => ({
          categoryId: c.categoryId,
          categoryName: c.categoryName,
          available: c.available,
          assigned: c.assigned,
          carriedIn: c.carriedIn,
          spent: c.spent,
          rollover: c.rollover,
          groupName: c.groupName,
        }))}
      />

      <DashboardExpensesClient
        userId={userId}
        month={month}
        monthLabelPretty={monthLabelPretty}
        categories={categories}
        otherUserName={otherUserName}
        initialExpenses={expensePage.expenses}
        incomeEntries={incomeResult.entries}
        mergedTransactionsDisplayLimit={DASHBOARD_TRANSACTIONS_DISPLAY_LIMIT}
      />

      <WhenDashboardTileEnabled tile="aiAnalysis">
        <AiAnalysisButton month={month} enabled={resolveAiInteractiveEnabled()} />
      </WhenDashboardTileEnabled>
    </div>
  );
}
