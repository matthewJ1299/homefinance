import { BudgetAiReportPageClient } from "@/components/budget-ai/budget-ai-report-page-client";
import { auth } from "@/lib/auth";
import { getAIAnalysisRunRepository, getUserRepository } from "@/lib/repositories";
import { isAIConfiguredForTier } from "@/lib/services/ai.service";
import { resolveAiInteractiveEnabled } from "@/lib/services/feature-access.service";
import { getCurrentBudgetMonth } from "@/lib/utils/date";

type BudgetAiReportPageProps = {
  searchParams: Promise<{ month?: string; runId?: string }>;
};

export default async function BudgetAiReportPage({ searchParams }: BudgetAiReportPageProps) {
  const session = await auth();
  const userId = Number(session?.user?.id ?? 0);
  const userRepo = getUserRepository();
  const [budgetMonthStartDay, aiUsePaid] = userId
    ? await Promise.all([userRepo.getBudgetMonthStartDay(userId), userRepo.getAiUsePaid(userId)])
    : [1, false];
  const aiConfigured = aiUsePaid ? isAIConfiguredForTier("paid") : isAIConfiguredForTier("free");
  const aiEnabled = userId ? await resolveAiInteractiveEnabled(userId, aiConfigured) : false;

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

  return (
    <BudgetAiReportPageClient
      enabled={aiEnabled}
      monthParam={month}
      runs={runs}
      selectedRun={selected}
    />
  );
}
