import { all, lastInsertId, run } from "@/lib/db";
import type {
  AdminUserSummary,
  IAdminUserRepository,
} from "../interfaces/admin-user.repository";

interface UserRow {
  id: number;
  name: string;
  email: string;
  household_id: number;
  is_super_admin: boolean;
  ai_feature_allowed: boolean;
  recon_feature_allowed: boolean;
  ai_enabled: boolean;
  recon_enabled: boolean;
  created_at: string;
}

function toSummary(r: UserRow): AdminUserSummary {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    householdId: r.household_id,
    isSuperAdmin: r.is_super_admin === true,
    aiFeatureAllowed: r.ai_feature_allowed === true,
    reconFeatureAllowed: r.recon_feature_allowed === true,
    aiEnabled: r.ai_enabled === true,
    reconEnabled: r.recon_enabled === true,
    createdAt: r.created_at,
  };
}

export class AdminUserRepository implements IAdminUserRepository {
  async listUsers(filter?: { householdId?: number }): Promise<AdminUserSummary[]> {
    const where: string[] = [];
    const params: (string | number | boolean | null)[] = [];

    if (filter?.householdId != null) {
      where.push("household_id = ?");
      params.push(filter.householdId);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const rows = await all<UserRow>(
      `SELECT id, name, email, household_id, is_super_admin, ai_feature_allowed, recon_feature_allowed, ai_enabled, recon_enabled, created_at
       FROM users
       ${whereSql}
       ORDER BY household_id, id`,
      params
    );
    return rows.map(toSummary);
  }

  async createUser(input: {
    householdId: number;
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<number> {
    await run(
      "INSERT INTO users (name, email, password_hash, household_id, ai_feature_allowed, recon_feature_allowed, is_super_admin) VALUES (?, ?, ?, ?, false, false, false)",
      [input.name, input.email, input.passwordHash, input.householdId]
    );
    const id = await lastInsertId();
    if (id == null) {
      throw new Error("User insert did not return an id");
    }
    return id;
  }

  async setUserFeatureAccess(
    userId: number,
    access: { aiFeatureAllowed: boolean; reconFeatureAllowed: boolean }
  ): Promise<void> {
    await run(
      "UPDATE users SET ai_feature_allowed = ?, recon_feature_allowed = ? WHERE id = ?",
      [access.aiFeatureAllowed, access.reconFeatureAllowed, userId]
    );
  }

  async setUserSuperAdmin(userId: number, isSuperAdmin: boolean): Promise<void> {
    await run("UPDATE users SET is_super_admin = ? WHERE id = ?", [isSuperAdmin, userId]);
  }
}

