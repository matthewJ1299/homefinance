"use server";

import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
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
  const session = await auth();
  setRequestContextFromSession(session);
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  const userId = Number(session.user.id);
  if (!hasFeature("ai_budget_analysis")) {
    return { success: false, error: featureDeniedMessage("ai_budget_analysis") };
  }
  if (!resolveAiInteractiveEnabled()) {
    return { success: false, error: "AI is not configured on this server for your household tier." };
  }

  const { allowed, retryAfterMs } = checkRateLimit(userId);
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
}
