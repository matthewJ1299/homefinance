"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { hasFeature, featureDeniedMessage } from "@/lib/features/access";
import { resolveAiInteractiveEnabled, getHouseholdAiTier } from "@/lib/services/feature-access.service";
import { AIService } from "@/lib/services/ai.service";
import { BudgetAiApplyService } from "@/lib/services/budget-ai-apply.service";
import { checkRateLimit, recordCall } from "@/lib/services/ai-rate-limiter";

export type ApplyBudgetAiSuggestionsOptions = {
  moveIndexes?: number[];
  allocationIndexes?: number[];
};

export async function applyBudgetAiSuggestions(
  runId: number,
  options: ApplyBudgetAiSuggestionsOptions = {}
): Promise<
  | { success: true; appliedCount: number; applicationIds: number[]; errors: string[] }
  | { success: false; error: string; errors?: string[] }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  const userId = Number(session.user.id);
  setRequestContextFromSession(session);

  if (!hasFeature("ai_budget_analysis")) {
    return { success: false, error: featureDeniedMessage("ai_budget_analysis") };
  }
  if (!resolveAiInteractiveEnabled()) {
    return { success: false, error: "AI is not configured on this server for your household tier." };
  }

  const moveIndexes = options.moveIndexes ?? [];
  const allocationIndexes = options.allocationIndexes ?? [];
  if (moveIndexes.length === 0 && allocationIndexes.length === 0) {
    return { success: false, error: "Select at least one suggestion to apply." };
  }

  const service = new BudgetAiApplyService();
  const result = await service.applySuggestions({
    runId,
    userId,
    moveIndexes,
    allocationIndexes,
  });

  if (result.appliedCount > 0) {
    revalidatePath("/budget");
    revalidatePath("/budget-ai-report");
  }

  if (!result.success) {
    return {
      success: false,
      error: result.errors[0] ?? "Could not apply suggestions.",
      errors: result.errors,
    };
  }

  return {
    success: true,
    appliedCount: result.appliedCount,
    applicationIds: result.applicationIds,
    errors: result.errors,
  };
}

export async function replyToBudgetAiReport(
  runId: number,
  message: string
): Promise<
  | { success: true; reply: string; userMessageId: number; assistantMessageId: number }
  | { success: false; error: string; userMessageId?: number }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  const userId = Number(session.user.id);
  setRequestContextFromSession(session);

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
      error:
        retryMin > 0
          ? `Rate limit reached. Try again in ${retryMin} minute(s).`
          : "Rate limit reached. Try again later.",
    };
  }

  const tier = getHouseholdAiTier();
  const service = new AIService();
  const result = await service.replyToBudgetReport(runId, userId, message, tier);
  if (result.success) {
    recordCall(userId);
    revalidatePath("/budget-ai-report");
  }
  return result;
}
