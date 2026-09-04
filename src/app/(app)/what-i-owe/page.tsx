import { Suspense } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { getUserRepository } from "@/lib/repositories";
import { hasFeature } from "@/lib/features/access";
import { FeatureUnavailable } from "@/components/ui/feature-unavailable";
import { SplitService } from "@/lib/services/split.service";
import { MortgageService } from "@/lib/services/mortgage.service";
import { getDefaultBudgetMonthForUser } from "@/lib/utils/budget-month-for-user";
import { formatBudgetMonthLabel, formatDisplayDate } from "@/lib/utils/date";
import { MonthNavigator } from "@/components/layout/month-navigator";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PrintButton } from "@/components/what-i-owe/print-button";
import { StatementViewToggle } from "@/components/what-i-owe/view-toggle";
import { StatementTotals } from "@/components/what-i-owe/statement-totals";
import { parseOwedStatementView } from "@/components/what-i-owe/statement-view";
import { StatementPersonTabs } from "@/components/what-i-owe/person-tabs";

interface WhatIOwePageProps {
  searchParams: Promise<{ month?: string; view?: string; with?: string }>;
}

export default async function WhatIOwePage({ searchParams }: WhatIOwePageProps) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = Number(session.user.id);

  const userRepo = getUserRepository();
  if (!hasFeature("what_i_owe")) {
    return <FeatureUnavailable feature="what_i_owe" />;
  }

  const { month: monthParam, view: viewParam, with: withParam } = await searchParams;
  const view = parseOwedStatementView(viewParam);
  const month = monthParam ?? (await getDefaultBudgetMonthForUser(userId));

  const [others, startDay] = await Promise.all([
    userRepo.findAllExcept(userId),
    userRepo.getBudgetMonthStartDay(userId),
  ]);
  // Whose statement? Explicit when chosen, otherwise the first housemate. With
  // three people there is no "the other person", so the tabs below do the
  // choosing -- this page no longer decides silently on the reader's behalf.
  const requestedId = Number(withParam);
  const [firstMember] = others;
  const them = others.find((u) => u.id === requestedId) ?? firstMember;
  const monthLabel = formatBudgetMonthLabel(month, startDay);

  if (!them) {
    return (
      <div className="p-4 space-y-6 pb-24 md:pb-6">
        <PageHeader title="What I owe" />
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            No other household member to share costs with.
          </CardContent>
        </Card>
      </div>
    );
  }

  const asOfDate = format(new Date(), "yyyy-MM-dd");
  const statement = await new SplitService().getStatementSinceLastSettlement(
    userId,
    them.id,
    asOfDate
  );

  const mortgageService = new MortgageService();
  const [schedule, { userConfigs }] = await Promise.all([
    mortgageService.getSchedule(),
    mortgageService.getConfig(),
  ]);
  const subjectUserId = view === "owed" ? them.id : userId;
  const mortgageAmount = mortgageShareForUser(subjectUserId, month, schedule, userConfigs);

  const isOwedView = view === "owed";
  const lineItems = isOwedView ? statement.owedItems : statement.owingItems;
  const lineItemsTotal = isOwedView ? statement.owedTotal : statement.owingTotal;
  const contraTotal = isOwedView ? statement.owingTotal : statement.owedTotal;
  const splitNet = lineItemsTotal - contraTotal;
  const subtotalLabel = isOwedView
    ? `${them.name}'s share of what you paid`
    : `Your share of what ${them.name} paid`;
  const contraLabel = isOwedView
    ? `Less: your share of ${them.name}'s splits`
    : `Less: ${them.name}'s share of your splits`;

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
        <StatementPersonTabs people={others} selectedId={them.id} />
      </Suspense>
      <Suspense fallback={null}>
        <StatementViewToggle current={view} />
      </Suspense>
      <PageHeader
        title={title}
        description={`${splitPeriodLabel}. Split total is the net still owed, not the sum of listed costs. Mortgage is this budget month.`}
        actions={<PrintButton />}
      />
      <StatementTotals
        lineItems={lineItems}
        lineItemsTotal={lineItemsTotal}
        subtotalLabel={subtotalLabel}
        contraTotal={contraTotal}
        contraLabel={contraLabel}
        splitNet={splitNet}
        mortgageAmount={mortgageAmount}
        mortgageLabel={mortgageLabel}
      />
      <p className="text-xs text-muted-foreground print:hidden">
        The mortgage line is this budget month&rsquo;s share.{" "}
        <Link href="/how-this-works/equity" className="font-semibold text-primary">
          How your share of the house works
        </Link>
      </p>
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
