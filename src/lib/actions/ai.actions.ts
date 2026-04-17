"use server";

import { auth } from "@/lib/auth";
import { AIService } from "@/lib/services/ai.service";
import { checkRateLimit, recordCall } from "@/lib/services/ai-rate-limiter";
import type { AnalyzeExpensesOutcome } from "@/lib/services/ai.service";
import { getUserRepository } from "@/lib/repositories";

export type AnalyzeExpensesOptions = {
  /** When true, every expense line for the month is included (larger prompt; better recategorisation hints). Default false = summary + categories only. */
  includeTransactions?: boolean;
  /** Optional free-text budget context appended to the AI prompt. */
  budgetContext?: string;
};

export async function analyzeExpenses(
  month: string,
  options: AnalyzeExpensesOptions = {}
): Promise<AnalyzeExpensesOutcome> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  const userId = Number(session.user.id);
  const userRepo = getUserRepository();
  const [aiFeatureAllowed, aiEnabled] = await Promise.all([
    userRepo.getAiFeatureAllowed(userId),
    userRepo.getAiEnabled(userId),
  ]);
  if (!aiFeatureAllowed) {
    return {
      success: false,
      error: "AI analysis is not enabled for your account. An administrator can grant access.",
    };
  }
  if (!aiEnabled) {
    return { success: false, error: "AI is disabled for your user. Enable it under Settings → AI analysis." };
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
  const usePaid = await userRepo.getAiUsePaid(userId);
  const includeTransactions = options.includeTransactions === true;
  const result = await service.analyzeExpenses(month, userId, usePaid ? "paid" : "free", {
    includeTransactions,
    budgetContext: options.budgetContext,
  });
  if (result.success) {
    recordCall(userId);
  }
  return result;
}
