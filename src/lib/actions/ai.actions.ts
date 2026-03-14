"use server";

import { auth } from "@/lib/auth";
import { AIService } from "@/lib/services/ai.service";
import { checkRateLimit, recordCall } from "@/lib/services/ai-rate-limiter";
import type { AnalyzeExpensesOutcome } from "@/lib/services/ai.service";

export async function analyzeExpenses(month: string): Promise<AnalyzeExpensesOutcome> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  const userId = Number(session.user.id);

  const { allowed, retryAfterMs } = checkRateLimit(userId);
  if (!allowed) {
    const retryMin = retryAfterMs != null ? Math.ceil(retryAfterMs / 60000) : 0;
    return {
      success: false,
      error: retryMin > 0 ? `Rate limit reached. Try again in ${retryMin} minute(s).` : "Rate limit reached. Try again later.",
    };
  }

  const service = new AIService();
  const result = await service.analyzeExpenses(month, userId);
  if (result.success) {
    recordCall(userId);
  }
  return result;
}
