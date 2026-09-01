import { auth } from "@/lib/auth";
import { getUserRepository } from "@/lib/repositories";
import { SplitService } from "@/lib/services/split.service";
import { MortgageService } from "@/lib/services/mortgage.service";
import {
  getDefaultBudgetMonthForUser,
  getBudgetPeriodForUserMonth,
} from "@/lib/utils/budget-month-for-user";
import { formatBudgetMonthLabel, formatDisplayDate } from "@/lib/utils/date";
import { formatRand } from "@/lib/utils/currency";
import { MonthNavigator } from "@/components/layout/month-navigator";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrintButton } from "@/components/owed-to-me/print-button";
import { OwedToMeDisabledPlaceholder } from "@/components/owed-to-me/disabled-placeholder";

interface OwedToMePageProps {
  searchParams: Promise<{ month?: string }>;
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

  const { month: monthParam } = await searchParams;
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

  const period = await getBudgetPeriodForUserMonth(month, userId);
  const statement = await new SplitService().getWhatIsOwedToMe(userId, them.id, period);

  // Their share of this month's mortgage payment, taken from the repayment schedule.
  const mortgageService = new MortgageService();
  const [schedule, { userConfigs }] = await Promise.all([
    mortgageService.getSchedule(),
    mortgageService.getConfig(),
  ]);
  let mortgageShare = 0;
  if (schedule && userConfigs.length >= 2) {
    const sorted = [...userConfigs].sort((a, b) => b.baseSplitPct - a.baseSplitPct);
    const themIsUserB = sorted[1]?.userId === them.id;
    const row = schedule.schedule.find((r) => r.date === month);
    mortgageShare = row
      ? themIsUserB
        ? row.userBPayment
        : row.userAPayment
      : themIsUserB
        ? schedule.monthlyPaymentUserB
        : schedule.monthlyPaymentUserA;
  }

  const total = statement.splitNet + mortgageShare;

  return (
    <div className="p-4 space-y-6 pb-24 md:pb-6">
      <MonthNavigator className="print:hidden" />
      <PageHeader
        title={`What ${them.name} owes you`}
        description={monthLabel}
        actions={<PrintButton />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Split costs</CardTitle>
        </CardHeader>
        <CardContent>
          {statement.lineItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No split costs allocated to {them.name} this month.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium whitespace-nowrap">Date</th>
                    <th className="py-2 pr-3 font-medium">Description</th>
                    <th className="py-2 font-medium text-right whitespace-nowrap">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.lineItems.map((item) => (
                    <tr key={item.expenseId} className="border-b border-border/60">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {formatDisplayDate(item.date)}
                      </td>
                      <td className="py-2 pr-3">
                        {item.note?.trim() || item.categoryName || "—"}
                      </td>
                      <td className="py-2 text-right tabular-nums whitespace-nowrap">
                        {formatRand(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-medium">
                    <td className="py-2 pr-3" colSpan={2}>
                      Subtotal
                    </td>
                    <td className="py-2 text-right tabular-nums whitespace-nowrap">
                      {formatRand(statement.splitSubtotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {statement.settlements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payments received this month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <tbody>
                  {statement.settlements.map((s) => (
                    <tr key={s.id} className="border-b border-border/60">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {formatDisplayDate(s.date)}
                      </td>
                      <td className="py-2 pr-3">Payment from {them.name}</td>
                      <td className="py-2 text-right tabular-nums whitespace-nowrap">
                        -{formatRand(s.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-medium">
                    <td className="py-2 pr-3" colSpan={2}>
                      Total received
                    </td>
                    <td className="py-2 text-right tabular-nums whitespace-nowrap">
                      -{formatRand(statement.settlementsTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {mortgageShare > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mortgage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>
                {them.name} share ({monthLabel})
              </span>
              <span className="tabular-nums font-medium">{formatRand(mortgageShare)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Based on the current repayment split.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex items-center justify-between py-4 text-base font-semibold">
          <span>Total due</span>
          <span className="tabular-nums">{formatRand(total)}</span>
        </CardContent>
      </Card>
    </div>
  );
}
