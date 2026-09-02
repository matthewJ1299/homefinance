import { getHouseholdFeatureRepository } from "@/lib/repositories";
import { get } from "@/lib/db";
import { runWithRequestContext } from "@/lib/db/request-context";
import type { FeatureKey } from "./registry";

/**
 * Bind household entitlements for background jobs that have no session.
 * `hasFeature()` behaves the same as inside an authenticated request.
 */
export async function runWithHouseholdFeatures<T>(
  householdId: number,
  fn: () => T | Promise<T>
): Promise<T> {
  const keys = await getHouseholdFeatureRepository().listEnabledKeys(householdId);
  const tierRow = await get<{ ai_tier: string | null }>(
    "SELECT ai_tier FROM households WHERE id = ?",
    [householdId]
  );
  const aiTier = tierRow?.ai_tier === "paid" ? "paid" : "free";
  return runWithRequestContext(
    {
      householdId,
      featureKeys: keys,
      aiTier,
      householdApprovalStatus: "active",
    },
    () => fn()
  );
}
