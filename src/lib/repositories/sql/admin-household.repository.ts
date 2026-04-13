import { all, lastInsertId, run } from "@/lib/db";
import type {
  AdminHouseholdSummary,
  IAdminHouseholdRepository,
} from "../interfaces/admin-household.repository";

interface HouseholdRow {
  id: number;
  name: string;
  ai_feature_allowed: boolean;
  recon_feature_allowed: boolean;
  created_at: string;
}

function toSummary(r: HouseholdRow): AdminHouseholdSummary {
  return {
    id: r.id,
    name: r.name,
    aiFeatureAllowed: r.ai_feature_allowed === true,
    reconFeatureAllowed: r.recon_feature_allowed === true,
    createdAt: r.created_at,
  };
}

export class AdminHouseholdRepository implements IAdminHouseholdRepository {
  async listHouseholds(): Promise<AdminHouseholdSummary[]> {
    const rows = await all<HouseholdRow>(
      "SELECT id, name, ai_feature_allowed, recon_feature_allowed, created_at FROM households ORDER BY id"
    );
    return rows.map(toSummary);
  }

  async createHousehold(name: string): Promise<number> {
    await run("INSERT INTO households (name) VALUES (?)", [name]);
    const id = await lastInsertId();
    if (id == null) {
      throw new Error("Household insert did not return an id");
    }
    return id;
  }

  async updateFeaturePolicy(
    householdId: number,
    policy: { aiFeatureAllowed: boolean; reconFeatureAllowed: boolean }
  ): Promise<void> {
    await run(
      "UPDATE households SET ai_feature_allowed = ?, recon_feature_allowed = ? WHERE id = ?",
      [policy.aiFeatureAllowed, policy.reconFeatureAllowed, householdId]
    );
  }
}

