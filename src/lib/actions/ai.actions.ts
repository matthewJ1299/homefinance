"use server";

import { authedAction } from "@/lib/actions/_shared/authed-action";
import { hasFeature, featureDeniedMessage } from "@/lib/features/access";
import { resolveAiInteractiveEnabled, getHouseholdAiTier } from "@/lib/services/feature-access.service";
import { AIService } from "@/lib/services/ai.service";
import { checkRateLimit, recordCall } from "@/lib/services/ai-rate-limiter";
import type { AnalyzeExpensesOutcome } from "@/lib/services/ai.service";

export type AnalyzeExpensesOptions = {
  includeTransactions?: boolean;
  budgetContext?: string;
};

export async function analyzeExpenses(
  month: string,
  options: AnalyzeExpensesOptions = {}
): Promise<AnalyzeExpensesOutcome> {
  return authedAction<AnalyzeExpensesOutcome & { success: true }>(async ({ userId }) => {
  if (!hasFeature("ai_budget_analysis")) {
    return { success: false, error: featureDeniedMessage("ai_budget_analysis") };
  }
  if (!resolveAiInteractiveEnabled()) {
    return { success: false, error: "AI is not configured on this server for your household tier." };
  }

  const { allowed, retryAfterMs } = await checkRateLimit(userId);
  if (!allowed) {
    const retryMin = retryAfterMs != null ? Math.ceil(retryAfterMs / 60000) : 0;
    return {
      success: false,
      error: retryMin > 0 ? `Rate limit reached. Try again in ${retryMin} minute(s).` : "Rate limit reached. Try again later.",
    };
  }

  const service = new AIService();
  const tier = getHouseholdAiTier();
  const includeTransactions = options.includeTransactions === true;
  const result = await service.analyzeExpenses(month, userId, tier, {
    includeTransactions,
    budgetContext: options.budgetContext,
  });
  if (result.success) {
    recordCall(userId);
  }
  return result;
  }, { onError: "The analysis didn't run. Try again." });
}
