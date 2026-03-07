import { auth } from "@/lib/auth";
import { initDb } from "@/lib/db";
import { BudgetService } from "@/lib/services/budget.service";
import { getCurrentMonth } from "@/lib/utils/date";
import { MonthNavigator } from "@/components/layout/month-navigator";
import { BudgetOverview } from "@/components/budget/budget-overview";

interface BudgetPageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function BudgetPage({ searchParams }: BudgetPageProps) {
  await initDb();
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = Number(session.user.id);
  const { month: monthParam } = await searchParams;
  const month = monthParam ?? getCurrentMonth();

  const service = new BudgetService();
  const overview = await service.getOverview(month, userId);

  return (
    <div className="p-4 space-y-6">
      <MonthNavigator />
      <h1 className="text-xl font-semibold">Budget</h1>
      <BudgetOverview data={overview} />
    </div>
  );
}
