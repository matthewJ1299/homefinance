import { auth } from "@/lib/auth";
import { initDb } from "@/lib/db";
import { IncomeService } from "@/lib/services/income.service";
import { getCurrentMonth } from "@/lib/utils/date";
import { MonthNavigator } from "@/components/layout/month-navigator";
import { IncomeForm } from "@/components/income/income-form";
import { IncomeList } from "@/components/income/income-list";
import { formatRand } from "@/lib/utils/currency";

interface IncomePageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function IncomePage({ searchParams }: IncomePageProps) {
  await initDb();
  await auth();
  const { month: monthParam } = await searchParams;
  const month = monthParam ?? getCurrentMonth();

  const service = new IncomeService();
  const { entries, totals } = await service.getByMonth(month);

  return (
    <div className="p-4 space-y-6">
      <MonthNavigator />
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Income</h1>
        <span className="font-medium">{formatRand(totals.overall)}</span>
      </div>
      <section>
        <h2 className="font-medium text-sm text-muted-foreground mb-3">Add income</h2>
        <IncomeForm />
      </section>
      <section>
        <h2 className="font-medium text-sm text-muted-foreground mb-2">This month</h2>
        <IncomeList entries={entries} />
      </section>
    </div>
  );
}
