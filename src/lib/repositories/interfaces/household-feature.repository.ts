import type { FeatureKey } from "@/lib/features/registry";

export interface HouseholdFeatureGrant {
  householdId: number;
  featureKey: FeatureKey;
  enabled: boolean;
  expiresAt: Date | null;
  notes: string | null;
}

export interface IHouseholdFeatureRepository {
  /** Enabled, unexpired keys for one household. Used by admin screens and background jobs. */
  listEnabledKeys(householdId: number): Promise<FeatureKey[]>;
  /** Every household's grants, for the admin grid. */
  listAllGrants(): Promise<HouseholdFeatureGrant[]>;
  /** Upsert one grant (enable or disable). */
  setEnabled(input: {
    householdId: number;
    featureKey: FeatureKey;
    enabled: boolean;
    grantedByUserId: number;
  }): Promise<void>;
}
