import { BudgetAiReportPageClient } from "@/components/budget-ai/budget-ai-report-page-client";
import { auth } from "@/lib/auth";
import { hasFeature } from "@/lib/features/access";
import { FeatureUnavailable } from "@/components/ui/feature-unavailable";
import {
  getAIAnalysisRunApplicationRepository,
  getAIAnalysisRunMessageRepository,
  getAIAnalysisRunRepository,
  getUserRepository,
} from "@/lib/repositories";
import { BudgetService } from "@/lib/services/budget.service";
import { resolveAiInteractiveEnabled } from "@/lib/services/feature-access.service";
import { getCurrentBudgetMonth } from "@/lib/utils/date";
import { normalizeBudgetAnalysisReport } from "@/lib/utils/normalize-budget-analysis-report";

type BudgetAiReportPageProps = {
  searchParams: Promise<{ month?: string; runId?: string }>;
};

export default async function BudgetAiReportPage({ searchParams }: BudgetAiReportPageProps) {
  const session = await auth();
  if (!hasFeature("ai_budget_analysis")) {
    return <FeatureUnavailable feature="ai_budget_analysis" />;
  }

  const userId = Number(session?.user?.id ?? 0);
  const userRepo = getUserRepository();
  const budgetMonthStartDay = userId
    ? await userRepo.getBudgetMonthStartDay(userId)
    : 1;
  const aiEnabled = resolveAiInteractiveEnabled();

  const { month: monthParam, runId: runIdParam } = await searchParams;
  const month = monthParam ?? getCurrentBudgetMonth(budgetMonthStartDay);
  const runId = runIdParam ? Number(runIdParam) : null;
  const repo = getAIAnalysisRunRepository();
  const runs = userId ? await repo.listExpenseMonthlyRuns(userId, 80) : [];

  const selected =
    userId && runId
      ? await repo.getRunForUser(userId, runId)
      : userId
        ? await repo.getLatestExpenseMonthlyRunForMonth(userId, month)
        : null;

  const report = selected ? normalizeBudgetAnalysisReport(selected.outputJson) : null;

  let categories: { categoryId: number; categoryName: string; allocated: number; remaining: number }[] = [];
  let messages: Awaited<ReturnType<ReturnType<typeof getAIAnalysisRunMessageRepository>["listByRun"]>> = [];
  let applications: Awaited<
    ReturnType<ReturnType<typeof getAIAnalysisRunApplicationRepository>["listByRun"]>
  > = [];

  if (userId && selected) {
    const budgetService = new BudgetService();
    const overview = await budgetService.getOverview(selected.month, userId);
    categories = overview.categories.map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      allocated: c.allocated,
      remaining: c.remaining,
    }));
    try {
      messages = await getAIAnalysisRunMessageRepository().listByRun(userId, selected.id);
      applications = await getAIAnalysisRunApplicationRepository().listByRun(userId, selected.id);
    } catch {
      messages = [];
      applications = [];
    }
  }

  return (
    <BudgetAiReportPageClient
      enabled={aiEnabled}
      monthParam={month}
      runs={runs}
      selectedRun={selected}
      report={report}
      categories={categories}
      messages={messages}
      applications={applications}
    />
  );
}
