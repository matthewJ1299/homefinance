import { all, get, lastInsertId, run } from "@/lib/db";
import { getHouseholdFeatureRepository } from "@/lib/repositories";
import { toFeatureKeys, type FeatureKey } from "@/lib/features/registry";
import type {
  AdminHouseholdDetail,
  AdminHouseholdSummary,
  IAdminHouseholdRepository,
} from "../interfaces/admin-household.repository";

interface HouseholdRow {
  id: number;
  name: string;
  approval_status: string | null;
  ai_tier: string | null;
  created_at: string;
  member_count: number;
}

function isMissingColumnError(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && "code" in err && err.code === "42703");
}

function parseApprovalStatus(value: string | null | undefined): "pending" | "active" | "rejected" {
  if (value === "pending" || value === "rejected") return value;
  return "active";
}

function toSummary(r: HouseholdRow, enabledFeatureKeys: FeatureKey[]): AdminHouseholdSummary {
  return {
    id: r.id,
    name: r.name,
    approvalStatus: parseApprovalStatus(r.approval_status),
    memberCount: Number(r.member_count),
    aiTier: r.ai_tier === "paid" ? "paid" : "free",
    enabledFeatureKeys,
    createdAt: r.created_at,
  };
}

function enabledKeysByHousehold(
  grants: { householdId: number; featureKey: string; enabled: boolean }[]
): Map<number, FeatureKey[]> {
  const map = new Map<number, FeatureKey[]>();
  for (const grant of grants) {
    if (!grant.enabled) continue;
    const keys = map.get(grant.householdId) ?? [];
    keys.push(...toFeatureKeys([grant.featureKey]));
    map.set(grant.householdId, keys);
  }
  return map;
}

export class AdminHouseholdRepository implements IAdminHouseholdRepository {
  async listHouseholds(): Promise<AdminHouseholdSummary[]> {
    const rows = await this.listHouseholdRows();
    const grants = await getHouseholdFeatureRepository().listAllGrants();
    const byHousehold = enabledKeysByHousehold(grants);
    return rows.map((row) => toSummary(row, byHousehold.get(row.id) ?? []));
  }

  async getHousehold(householdId: number): Promise<AdminHouseholdDetail | null> {
    const row = await this.getHouseholdRow(householdId);
    if (!row) return null;
    const enabledKeys = await getHouseholdFeatureRepository().listEnabledKeys(householdId);
    return toSummary(row, enabledKeys);
  }

  async createHousehold(
    name: string,
    approvalStatus: "pending" | "active" | "rejected" = "active"
  ): Promise<number> {
    try {
      await run("INSERT INTO households (name, approval_status) VALUES (?, ?)", [
        name,
        approvalStatus,
      ]);
    } catch (err) {
      if (!isMissingColumnError(err)) throw err;
      await run("INSERT INTO households (name) VALUES (?)", [name]);
    }
    const id = await lastInsertId();
    if (id == null) {
      throw new Error("Household insert did not return an id");
    }
    return id;
  }

  async renameHousehold(householdId: number, name: string): Promise<void> {
    await run("UPDATE households SET name = ? WHERE id = ?", [name, householdId]);
  }

  async getAiTier(householdId: number): Promise<"free" | "paid"> {
    try {
      const row = await get<{ ai_tier: string | null }>(
        "SELECT ai_tier FROM households WHERE id = ?",
        [householdId]
      );
      return row?.ai_tier === "paid" ? "paid" : "free";
    } catch (err) {
      if (isMissingColumnError(err)) return "free";
      throw err;
    }
  }

  async setAiTier(householdId: number, tier: "free" | "paid"): Promise<void> {
    try {
      await run("UPDATE households SET ai_tier = ? WHERE id = ?", [tier, householdId]);
    } catch (err) {
      if (isMissingColumnError(err)) {
        throw new Error(
          'Database is missing column "households.ai_tier". Run `npm run db:push` to apply migrations.'
        );
      }
      throw err;
    }
  }

  async grantCoreFeatures(householdId: number, grantedByUserId: number): Promise<void> {
    const repo = getHouseholdFeatureRepository();
    for (const key of ["mortgage", "goals"] as const) {
      await repo.setEnabled({
        householdId,
        featureKey: key,
        enabled: true,
        grantedByUserId,
      });
    }
  }

  private async listHouseholdRows(): Promise<HouseholdRow[]> {
    try {
      return await all<HouseholdRow>(
        `SELECT h.id, h.name, h.approval_status, h.ai_tier, h.created_at,
                COUNT(u.id)::int AS member_count
           FROM households h
           LEFT JOIN users u ON u.household_id = h.id
          GROUP BY h.id, h.name, h.approval_status, h.ai_tier, h.created_at
          ORDER BY h.id`
      );
    } catch (err) {
      if (!isMissingColumnError(err)) throw err;
      const rows = await all<Omit<HouseholdRow, "approval_status" | "ai_tier"> & {
        approval_status?: string | null;
        ai_tier?: string | null;
      }>(
        `SELECT h.id, h.name, h.created_at, COUNT(u.id)::int AS member_count
           FROM households h
           LEFT JOIN users u ON u.household_id = h.id
          GROUP BY h.id, h.name, h.created_at
          ORDER BY h.id`
      );
      return rows.map((row) => ({
        ...row,
        approval_status: "active",
        ai_tier: "free",
      }));
    }
  }

  private async getHouseholdRow(householdId: number): Promise<HouseholdRow | null> {
    try {
      return await get<HouseholdRow>(
        `SELECT h.id, h.name, h.approval_status, h.ai_tier, h.created_at,
                COUNT(u.id)::int AS member_count
           FROM households h
           LEFT JOIN users u ON u.household_id = h.id
          WHERE h.id = ?
          GROUP BY h.id, h.name, h.approval_status, h.ai_tier, h.created_at`,
        [householdId]
      );
    } catch (err) {
      if (!isMissingColumnError(err)) throw err;
      const row = await get<Omit<HouseholdRow, "approval_status" | "ai_tier">>(
        `SELECT h.id, h.name, h.created_at, COUNT(u.id)::int AS member_count
           FROM households h
           LEFT JOIN users u ON u.household_id = h.id
          WHERE h.id = ?
          GROUP BY h.id, h.name, h.created_at`,
        [householdId]
      );
      if (!row) return null;
      return { ...row, approval_status: "active", ai_tier: "free" };
    }
  }
}
