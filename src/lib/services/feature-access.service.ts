import { getRequestContext } from "@/lib/db/request-context";
import { hasFeature } from "@/lib/features/access";
import { isAIConfiguredForTier } from "@/lib/services/ai.service";

/** Current household AI tier from request context (admin-set). */
export function getHouseholdAiTier(): "free" | "paid" {
  return getRequestContext()?.aiTier === "paid" ? "paid" : "free";
}

/** Whether AI buttons, report page, and analysis APIs should work for this request. */
export function resolveAiInteractiveEnabled(): boolean {
  if (!hasFeature("ai_budget_analysis")) return false;
  return isAIConfiguredForTier(getHouseholdAiTier());
}

/** Whether Recon nav, page, Graph connect, and mutating APIs should allow this request. */
export function resolveReconInteractiveEnabled(): boolean {
  return hasFeature("recon");
}
