import { auth } from "@/lib/auth";
import { SummaryService } from "@/lib/services/summary.service";
import { MortgageService } from "@/lib/services/mortgage.service";
import { getCurrentMonth } from "@/lib/utils/date";
import { subMonths } from "date-fns";
import { format } from "date-fns";
import { MonthNavigator } from "@/components/layout/month-navigator";
import { MonthlySnapshot } from "@/components/summary/monthly-snapshot";
import { SpendingByCategoryChart } from "@/components/summary/spending-by-category-chart";
import { IncomeVsExpensesChart } from "@/components/summary/income-vs-expenses-chart";
import { EquityGrowthChart } from "@/components/summary/equity-growth-chart";
import { getUserRepository } from "@/lib/repositories";

interface SummaryPageProps {
  searchParams: Promise<{ month?: string; from?: string; to?: string }>;
}

export default async function SummaryPage({ searchParams }: SummaryPageProps) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = Number(session.user.id);
  const { month: monthParam, from: fromParam, to: toParam } = await searchParams;
  const month = monthParam ?? getCurrentMonth();
  const to = toParam ?? getCurrentMonth();
  const from =
    fromParam ??
    format(subMonths(new Date(to + "-01"), 11), "yyyy-MM");

  const summaryService = new SummaryService();
  const [snapshot, trends] = await Promise.all([
    summaryService.getMonthlySnapshot(month, userId),
    summaryService.getTrends(from, to),
  ]);

  const userRepo = getUserRepository();
  const userRows = await userRepo.findAll();
  const userNames = Object.fromEntries(userRows.map((u) => [u.id, u.name]));

  const mortgageService = new MortgageService();
  const mortgageSchedule = await mortgageService.getSchedule();
  const equityData =
    mortgageSchedule?.schedule.map((row, i) => {
      const cumA =
        mortgageSchedule.equitySummary.userA.deposit +
        mortgageSchedule.schedule
          .slice(0, i + 1)
          .reduce((s, r) => s + r.userAPayment, 0);
      const cumB =
        mortgageSchedule.equitySummary.userB.deposit +
        mortgageSchedule.schedule
          .slice(0, i + 1)
          .reduce((s, r) => s + r.userBPayment, 0);
      return {
        month: row.month,
        date: row.date,
        userAEquity: cumA,
        userBEquity: cumB,
      };
    }) ?? [];

  return (
    <div className="p-4 space-y-6">
      <MonthNavigator />
      <h1 className="text-xl font-semibold">Summary</h1>

      <section>
        <h2 className="font-medium text-muted-foreground mb-2">Monthly snapshot</h2>
        <MonthlySnapshot
          month={snapshot.month}
          totalIncome={snapshot.totalIncome}
          totalExpenses={snapshot.totalExpenses}
          netPosition={snapshot.netPosition}
          expensesByUser={snapshot.expensesByUser}
          incomeByUser={snapshot.incomeByUser}
          userNames={userNames}
        />
      </section>

      <section>
        <h2 className="font-medium text-muted-foreground mb-2">Spending by category ({month})</h2>
        <SpendingByCategoryChart
          data={snapshot.budgetAdherence.map((b) => ({
            categoryName: b.categoryName,
            spent: b.spent,
          }))}
        />
      </section>

      <section>
        <h2 className="font-medium text-muted-foreground mb-2">Income vs expenses</h2>
        <IncomeVsExpensesChart data={trends.months} />
      </section>

      {equityData.length > 0 && mortgageSchedule && (
        <section>
          <h2 className="font-medium text-muted-foreground mb-2">Equity growth</h2>
          <EquityGrowthChart
            data={equityData}
            userAName={mortgageSchedule.equitySummary.userA.name}
            userBName={mortgageSchedule.equitySummary.userB.name}
          />
        </section>
      )}
    </div>
  );
}
