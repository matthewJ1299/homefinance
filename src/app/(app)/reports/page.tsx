import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { ReportService } from "@/lib/services/report.service";
import { getDefaultBudgetMonthForUser } from "@/lib/utils/budget-month-for-user";
import { formatDisplayDate } from "@/lib/utils/date";
import { ReportsPageClient } from "@/components/reports/reports-page-client";

interface ReportsPageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = Number(session.user.id);
  const { from: fromParam, to: toParam } = await searchParams;

  const service = new ReportService();
  const today = format(new Date(), "yyyy-MM-dd");

  // Since you started, not "this month" or "last 12": the first thing anyone
  // wants from a report is the whole shape of it.
  const earliest = await service.earliestDate(userId);
  const from = fromParam ?? earliest ?? today;
  const to = toParam ?? today;

  const [months, categories, accuracy, mortgage, currentMonth] = await Promise.all([
    service.monthlyInOut(userId, from, to),
    service.categoryTotals(userId, from, to),
    service.budgetAccuracy(userId, from, to),
    service.mortgageInterestVsEquity(),
    getDefaultBudgetMonthForUser(userId),
  ]);

  return (
    <div className="p-4 space-y-6 pb-24 md:pb-6">
      <h1 className="text-xl font-semibold tracking-tight">Reports</h1>
      <ReportsPageClient
        months={months}
        categories={categories}
        accuracy={accuracy}
        mortgage={mortgage}
        observations={service.worthDoing(accuracy)}
        currentMonth={currentMonth}
        periodLabel={
          earliest
            ? `Since you started · ${formatDisplayDate(from)} to ${formatDisplayDate(to)}`
            : "Nothing logged yet"
        }
      />
    </div>
  );
}
