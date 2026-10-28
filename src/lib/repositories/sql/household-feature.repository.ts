import { all, run } from "@/lib/db";
import { toFeatureKeys, type FeatureKey } from "@/lib/features/registry";
import type {
  HouseholdFeatureGrant,
  IHouseholdFeatureRepository,
} from "../interfaces/household-feature.repository";

interface HouseholdFeatureRow {
  household_id: number;
  feature_key: string;
  enabled: boolean;
  expires_at: Date | string | null;
  notes: string | null;
}

function toGrant(r: HouseholdFeatureRow): HouseholdFeatureGrant {
  return {
    householdId: Number(r.household_id),
    featureKey: r.feature_key as FeatureKey,
    enabled: r.enabled === true,
    expiresAt: r.expires_at ? new Date(r.expires_at) : null,
    notes: r.notes,
  };
}

/**
 * Entitlements are administered across tenants by a super-admin, so this repository is
 * deliberately NOT `requireHouseholdId()`-scoped like the domain repositories. Every
 * caller is either behind `requireSuperAdmin()` or a background job passing an explicit
 * `householdId`.
 */
export class HouseholdFeatureRepository implements IHouseholdFeatureRepository {
  async listEnabledKeys(householdId: number): Promise<FeatureKey[]> {
    const rows = await all<{ feature_key: string }>(
      `SELECT feature_key FROM household_features
       WHERE household_id = ? AND enabled AND (expires_at IS NULL OR expires_at > NOW())`,
      [householdId]
    );
    return toFeatureKeys(rows.map((r) => r.feature_key));
  }

  async listAllGrants(): Promise<HouseholdFeatureGrant[]> {
    const rows = await all<HouseholdFeatureRow>(
      `SELECT household_id, feature_key, enabled, expires_at, notes
       FROM household_features
       ORDER BY household_id, feature_key`
    );
    return rows.map(toGrant);
  }

  async setEnabled(input: {
    householdId: number;
    featureKey: FeatureKey;
    enabled: boolean;
    grantedByUserId: number;
  }): Promise<void> {
    await run(
      `INSERT INTO household_features (household_id, feature_key, enabled, granted_by_user_id)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (household_id, feature_key)
       DO UPDATE SET enabled = EXCLUDED.enabled,
                     granted_at = NOW(),
                     granted_by_user_id = EXCLUDED.granted_by_user_id`,
      [input.householdId, input.featureKey, input.enabled, input.grantedByUserId]
    );
  }
}
