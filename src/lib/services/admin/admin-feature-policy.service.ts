import type { FeatureKey } from "@/lib/features/registry";
import { FEATURE_KEYS } from "@/lib/features/registry";
import { getHouseholdFeatureRepository } from "@/lib/repositories";
import type { IAdminHouseholdRepository } from "@/lib/repositories/interfaces/admin-household.repository";
import { run } from "@/lib/db";

export interface HouseholdEntitlementsInput {
  householdId: number;
  enabledFeatures: readonly FeatureKey[];
  aiTier: "free" | "paid";
  grantedByUserId: number;
}

export interface IAdminFeaturePolicyService {
  getEntitlements(householdId: number): Promise<{ enabledKeys: FeatureKey[]; aiTier: "free" | "paid" }>;
  setEntitlements(input: HouseholdEntitlementsInput): Promise<void>;
  setApprovalStatus(householdId: number, status: "pending" | "active" | "rejected"): Promise<void>;
}

export class AdminFeaturePolicyService implements IAdminFeaturePolicyService {
  constructor(private readonly households: IAdminHouseholdRepository) {}

  async getEntitlements(householdId: number): Promise<{ enabledKeys: FeatureKey[]; aiTier: "free" | "paid" }> {
    const featureRepo = getHouseholdFeatureRepository();
    const enabledKeys = await featureRepo.listEnabledKeys(householdId);
    const aiTier = await this.households.getAiTier(householdId);
    return { enabledKeys, aiTier };
  }

  async setEntitlements(input: HouseholdEntitlementsInput): Promise<void> {
    const featureRepo = getHouseholdFeatureRepository();
    const enabledSet = new Set(input.enabledFeatures);
    for (const key of FEATURE_KEYS) {
      await featureRepo.setEnabled({
        householdId: input.householdId,
        featureKey: key,
        enabled: enabledSet.has(key),
        grantedByUserId: input.grantedByUserId,
      });
    }
    await this.households.setAiTier(input.householdId, input.aiTier);
  }

  async setApprovalStatus(
    householdId: number,
    status: "pending" | "active" | "rejected"
  ): Promise<void> {
    try {
      await run("UPDATE households SET approval_status = ? WHERE id = ?", [status, householdId]);
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "42703") {
        throw new Error(
          'Database is missing column "households.approval_status". Run `npm run db:push` to apply migrations.'
        );
      }
      throw err;
    }
  }
}
