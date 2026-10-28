import { all, get, run } from "@/lib/db";
import type { AdminUserSummary, IAdminUserRepository } from "../interfaces/admin-user.repository";

interface UserRow {
  id: number;
  name: string;
  email: string;
  household_id: number;
  is_super_admin: boolean;
  must_change_password: boolean | null;
  created_at: string;
}

function toSummary(r: UserRow): AdminUserSummary {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    householdId: r.household_id,
    isSuperAdmin: r.is_super_admin === true,
    mustChangePassword: r.must_change_password === true,
    createdAt: r.created_at,
  };
}

export class AdminUserRepository implements IAdminUserRepository {
  async listUsers(filter?: { householdId?: number; search?: string }): Promise<AdminUserSummary[]> {
    const clauses: string[] = [];
    const params: (string | number | boolean | null)[] = [];
    if (filter?.householdId != null) {
      clauses.push("household_id = ?");
      params.push(filter.householdId);
    }
    if (filter?.search?.trim()) {
      clauses.push("(LOWER(name) LIKE ? OR LOWER(email) LIKE ?)");
      const q = `%${filter.search.trim().toLowerCase()}%`;
      params.push(q, q);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = await all<UserRow>(
      `SELECT id, name, email, household_id, is_super_admin, must_change_password, created_at
         FROM users ${where} ORDER BY id`,
      params
    );
    return rows.map(toSummary);
  }

  async createUser(input: {
    householdId: number;
    name: string;
    email: string;
    passwordHash: string;
    mustChangePassword?: boolean;
  }): Promise<number> {
    const row = await get<{ id: number }>(
      `INSERT INTO users (name, email, password_hash, household_id, must_change_password)
       VALUES (?, ?, ?, ?, ?) RETURNING id`,
      [
        input.name,
        input.email,
        input.passwordHash,
        input.householdId,
        input.mustChangePassword === true,
      ]
    );
    if (row?.id == null) throw new Error("User insert did not return an id");
    return Number(row.id);
  }

  async setUserSuperAdmin(userId: number, isSuperAdmin: boolean): Promise<void> {
    await run("UPDATE users SET is_super_admin = ? WHERE id = ?", [isSuperAdmin, userId]);
  }

  async moveUserToHousehold(userId: number, householdId: number): Promise<void> {
    await run("UPDATE users SET household_id = ? WHERE id = ?", [householdId, userId]);
  }
}
