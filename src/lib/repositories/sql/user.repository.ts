import { all, get, run } from "@/lib/db";
import { normalizeBudgetMonthStartDay } from "@/lib/utils/date";
import type { UserSummary, UserForAuth } from "../interfaces/user.repository";
import type { IUserRepository } from "../interfaces/user.repository";

interface UserRow {
  id: number;
  name: string;
  email?: string;
  password_hash?: string;
}

function toSummary(r: UserRow): UserSummary {
  return { id: r.id, name: r.name };
}

function toUserForAuth(r: UserRow & { email: string; password_hash: string }): UserForAuth {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    passwordHash: r.password_hash,
  };
}

export class UserRepository implements IUserRepository {
  async findAll(): Promise<UserSummary[]> {
    const rows = await all<UserRow>("SELECT id, name FROM users ORDER BY id");
    return rows.map(toSummary);
  }

  async findAllExcept(userId: number): Promise<UserSummary[]> {
    const rows = await all<UserRow>("SELECT id, name FROM users WHERE id != ? ORDER BY id", [userId]);
    return rows.map(toSummary);
  }

  async findById(id: number): Promise<UserSummary | null> {
    const row = await get<UserRow>("SELECT id, name FROM users WHERE id = ?", [id]);
    return row ? toSummary(row) : null;
  }

  async findByEmailForAuth(email: string): Promise<UserForAuth | null> {
    const row = await get<UserRow & { email: string; password_hash: string }>(
      "SELECT id, name, email, password_hash FROM users WHERE email = ?",
      [email]
    );
    return row ? toUserForAuth(row) : null;
  }

  async getBudgetMonthStartDay(userId: number): Promise<number> {
    const row = await get<{ budget_month_start_day: number | null }>(
      "SELECT budget_month_start_day FROM users WHERE id = ?",
      [userId]
    );
    const raw = row?.budget_month_start_day;
    if (raw == null) return 1;
    return normalizeBudgetMonthStartDay(raw);
  }

  async updateBudgetMonthStartDay(userId: number, day: number): Promise<void> {
    const normalized = normalizeBudgetMonthStartDay(day);
    await run("UPDATE users SET budget_month_start_day = ? WHERE id = ?", [normalized, userId]);
  }

  async getPrimaryAccountId(userId: number): Promise<number | null> {
    const row = await get<{ primary_account_id: number | null | string }>(
      "SELECT primary_account_id FROM users WHERE id = ?",
      [userId]
    );
    const raw = row?.primary_account_id;
    if (raw == null || raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  async setPrimaryAccountId(userId: number, accountId: number | null): Promise<void> {
    await run("UPDATE users SET primary_account_id = ? WHERE id = ?", [accountId, userId]);
  }
}
