import { Suspense } from "react";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { getUserRepository } from "@/lib/repositories";
import { SplitService } from "@/lib/services/split.service";
import { MortgageService } from "@/lib/services/mortgage.service";
import { getDefaultBudgetMonthForUser } from "@/lib/utils/budget-month-for-user";
import { formatBudgetMonthLabel, formatDisplayDate } from "@/lib/utils/date";
import { MonthNavigator } from "@/components/layout/month-navigator";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PrintButton } from "@/components/owed-to-me/print-button";
import { OwedToMeDisabledPlaceholder } from "@/components/owed-to-me/disabled-placeholder";
import { StatementViewToggle } from "@/components/owed-to-me/view-toggle";
import { StatementTotals } from "@/components/owed-to-me/statement-totals";
import { parseOwedStatementView } from "@/components/owed-to-me/statement-view";

interface OwedToMePageProps {
  searchParams: Promise<{ month?: string; view?: string }>;
}

export default async function OwedToMePage({ searchParams }: OwedToMePageProps) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = Number(session.user.id);

  const userRepo = getUserRepository();
  const enabled = await userRepo.getOwedToMeEnabled(userId);
  if (!enabled) {
    return <OwedToMeDisabledPlaceholder />;
  }

  const { month: monthParam, view: viewParam } = await searchParams;
  const view = parseOwedStatementView(viewParam);
  const month = monthParam ?? (await getDefaultBudgetMonthForUser(userId));

  const [others, startDay] = await Promise.all([
    userRepo.findAllExcept(userId),
    userRepo.getBudgetMonthStartDay(userId),
  ]);
  const them = others[0];
  const monthLabel = formatBudgetMonthLabel(month, startDay);

  if (!them) {
    return (
      <div className="p-4 space-y-6 pb-24 md:pb-6">
        <PageHeader title="Owed to me" />
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            No other household member to invoice.
          </CardContent>
        </Card>
      </div>
    );
  }

  const asOfDate = format(new Date(), "yyyy-MM-dd");
  const statement = await new SplitService().getStatementSinceLastSettlement(
    userId,
    them.id,
    view,
    asOfDate
  );

  const mortgageService = new MortgageService();
  const [schedule, { userConfigs }] = await Promise.all([
    mortgageService.getSchedule(),
    mortgageService.getConfig(),
  ]);
  const subjectUserId = view === "owed" ? them.id : userId;
  const mortgageAmount = mortgageShareForUser(subjectUserId, month, schedule, userConfigs);

  const title =
    view === "owed" ? `What ${them.name} owes you` : `What you owe ${them.name}`;
  const splitPeriodLabel = statement.lastSettlementDate
    ? `Splits since ${formatDisplayDate(statement.lastSettlementDate)} (day after last settlement)`
    : "All split costs (no settlement yet)";
  const mortgageLabel = `Total mortgage amount (${monthLabel})`;

  return (
    <div className="p-4 space-y-6 pb-24 md:pb-6">
      <MonthNavigator className="print:hidden" />
      <Suspense fallback={null}>
        <StatementViewToggle current={view} />
      </Suspense>
      <PageHeader
        title={title}
        description={`${splitPeriodLabel}. Mortgage is this budget month.`}
        actions={<PrintButton />}
      />
      <StatementTotals
        lineItems={statement.lineItems}
        splitTotal={statement.splitTotal}
        mortgageAmount={mortgageAmount}
        mortgageLabel={mortgageLabel}
      />
    </div>
  );
}

function mortgageShareForUser(
  userId: number,
  month: string,
  schedule: Awaited<ReturnType<MortgageService["getSchedule"]>>,
  userConfigs: { userId: number; baseSplitPct: number }[]
): number {
  if (!schedule || userConfigs.length < 2) return 0;
  const sorted = [...userConfigs].sort((a, b) => b.baseSplitPct - a.baseSplitPct);
  const isUserB = sorted[1]?.userId === userId;
  const row = schedule.schedule.find((r) => r.date === month);
  if (row) return isUserB ? row.userBPayment : row.userAPayment;
  return isUserB ? schedule.monthlyPaymentUserB : schedule.monthlyPaymentUserA;
}
