import { auth } from "@/lib/auth";
import { IncomeService } from "@/lib/services/income.service";
import { getSplitSettlementRepository } from "@/lib/repositories";
import { getDefaultBudgetMonthForUser } from "@/lib/utils/budget-month-for-user";
import { MonthNavigator } from "@/components/layout/month-navigator";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { IncomeForm } from "@/components/income/income-form";
import { IncomeList } from "@/components/income/income-list";
import { formatRand } from "@/lib/utils/currency";

interface IncomePageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function IncomePage({ searchParams }: IncomePageProps) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = Number(session.user.id);
  const { month: monthParam } = await searchParams;
  const month = monthParam ?? (await getDefaultBudgetMonthForUser(userId));

  const service = new IncomeService();
  const { entries, totals } = await service.getByMonth(month, userId);
  const settlements = await getSplitSettlementRepository().findAllForUser(userId);
  const settlementLinkedIncomeIds = settlements
    .map((s) => s.incomeId)
    .filter((id): id is number => id != null);

  return (
    <div className="p-4 space-y-6 pb-24 md:pb-6">
      <MonthNavigator />
      <PageHeader title="Income" actions={<span className="font-medium">{formatRand(totals.overall)}</span>} />
      <section>
        <h2 className="font-medium text-sm text-muted-foreground mb-3">Add income</h2>
        <IncomeForm />
      </section>
      <section>
        <h2 className="font-medium text-sm text-muted-foreground mb-2">This month</h2>
        <IncomeList entries={entries} settlementLinkedIncomeIds={settlementLinkedIncomeIds} />
      </section>
    </div>
  );
}
