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

  async getReconEnabled(userId: number): Promise<boolean> {
    const row = await get<{ recon_enabled: boolean | null }>(
      "SELECT recon_enabled FROM users WHERE id = ?",
      [userId]
    );
    return row?.recon_enabled === true;
  }

  async setReconEnabled(userId: number, enabled: boolean): Promise<void> {
    await run("UPDATE users SET recon_enabled = ? WHERE id = ?", [enabled, userId]);
  }

  async getOwedToMeEnabled(userId: number): Promise<boolean> {
    try {
      const row = await get<{ owed_to_me_enabled: boolean | null }>(
        "SELECT owed_to_me_enabled FROM users WHERE id = ?",
        [userId]
      );
      return row?.owed_to_me_enabled === true;
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "42703") {
        return false;
      }
      throw err;
    }
  }

  async setOwedToMeEnabled(userId: number, enabled: boolean): Promise<void> {
    try {
      await run("UPDATE users SET owed_to_me_enabled = ? WHERE id = ?", [enabled, userId]);
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "42703") {
        throw new Error(
          'Database is missing column "users.owed_to_me_enabled". Run `npm run db:push` to apply migrations.'
        );
      }
      throw err;
    }
  }

  async getReconFeatureAllowed(userId: number): Promise<boolean> {
    try {
      const row = await get<{ recon_feature_allowed: boolean | null }>(
        "SELECT recon_feature_allowed FROM users WHERE id = ?",
        [userId]
      );
      return row?.recon_feature_allowed === true;
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "42703") {
        return false;
      }
      throw err;
    }
  }

  async setReconFeatureAllowed(userId: number, allowed: boolean): Promise<void> {
    try {
      await run("UPDATE users SET recon_feature_allowed = ? WHERE id = ?", [allowed, userId]);
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "42703") {
        throw new Error(
          'Database is missing column "users.recon_feature_allowed". Run `npm run db:push` to apply migrations.'
        );
      }
      throw err;
    }
  }

  async getAiEnabled(userId: number): Promise<boolean> {
    try {
      const row = await get<{ ai_enabled: boolean | null }>("SELECT ai_enabled FROM users WHERE id = ?", [userId]);
      return row?.ai_enabled === true;
    } catch (err) {
      // Backwards-compatible: older DBs won't have the column until migrations are applied.
      if (err && typeof err === "object" && "code" in err && err.code === "42703") {
        return false;
      }
      throw err;
    }
  }

  async setAiEnabled(userId: number, enabled: boolean): Promise<void> {
    try {
      await run("UPDATE users SET ai_enabled = ? WHERE id = ?", [enabled, userId]);
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "42703") {
        throw new Error('Database is missing column "users.ai_enabled". Run `npm run db:push` to apply migrations.');
      }
      throw err;
    }
  }

  async getAiFeatureAllowed(userId: number): Promise<boolean> {
    try {
      const row = await get<{ ai_feature_allowed: boolean | null }>(
        "SELECT ai_feature_allowed FROM users WHERE id = ?",
        [userId]
      );
      return row?.ai_feature_allowed === true;
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "42703") {
        return false;
      }
      throw err;
    }
  }

  async setAiFeatureAllowed(userId: number, allowed: boolean): Promise<void> {
    try {
      await run("UPDATE users SET ai_feature_allowed = ? WHERE id = ?", [allowed, userId]);
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "42703") {
        throw new Error(
          'Database is missing column "users.ai_feature_allowed". Run `npm run db:push` to apply migrations.'
        );
      }
      throw err;
    }
  }

  async getAiUsePaid(userId: number): Promise<boolean> {
    try {
      const row = await get<{ ai_use_paid: boolean | null }>(
        "SELECT ai_use_paid FROM users WHERE id = ?",
        [userId]
      );
      return row?.ai_use_paid === true;
    } catch (err) {
      // Backwards-compatible: older DBs won't have the column until migrations are applied.
      if (err && typeof err === "object" && "code" in err && err.code === "42703") {
        return false;
      }
      throw err;
    }
  }

  async setAiUsePaid(userId: number, usePaid: boolean): Promise<void> {
    try {
      await run("UPDATE users SET ai_use_paid = ? WHERE id = ?", [usePaid, userId]);
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "42703") {
        throw new Error('Database is missing column "users.ai_use_paid". Run `npm run db:push` to apply migrations.');
      }
      throw err;
    }
  }
}
