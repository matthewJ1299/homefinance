import { all, get, run, lastInsertId } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import { normalizeBudgetMonthStartDay } from "@/lib/utils/date";
import type { UserSummary, UserForAuth } from "../interfaces/user.repository";
import type { IUserRepository } from "../interfaces/user.repository";
import type { SetupWizardState, SetupWizardStatus } from "../interfaces/user.repository";

interface UserRow {
  id: number;
  name: string;
  email?: string;
  password_hash?: string;
}

function isSetupWizardStatus(v: unknown): v is SetupWizardStatus {
  return v === "not_started" || v === "in_progress" || v === "dismissed" || v === "completed";
}

function toSummary(r: UserRow): UserSummary {
  return { id: r.id, name: r.name };
}

function toUserForAuth(
  r: UserRow & {
    email: string;
    password_hash: string;
    household_id: number;
    is_super_admin?: boolean;
  }
): UserForAuth {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    passwordHash: r.password_hash,
    householdId: r.household_id,
    isSuperAdmin: r.is_super_admin === true,
  };
}

export class UserRepository implements IUserRepository {
  async findAll(): Promise<UserSummary[]> {
    const hid = requireHouseholdId();
    const rows = await all<UserRow>(
      "SELECT id, name FROM users WHERE household_id = ? ORDER BY id",
      [hid]
    );
    return rows.map(toSummary);
  }

  async findAllExcept(userId: number): Promise<UserSummary[]> {
    const hid = requireHouseholdId();
    const rows = await all<UserRow>(
      "SELECT id, name FROM users WHERE id != ? AND household_id = ? ORDER BY id",
      [userId, hid]
    );
    return rows.map(toSummary);
  }

  async findById(id: number): Promise<UserSummary | null> {
    const hid = requireHouseholdId();
    const row = await get<UserRow>(
      "SELECT id, name FROM users WHERE id = ? AND household_id = ?",
      [id, hid]
    );
    return row ? toSummary(row) : null;
  }

  async findByEmailForAuth(email: string): Promise<UserForAuth | null> {
    try {
      const row = await get<
        UserRow & {
          email: string;
          password_hash: string;
          household_id: number;
          is_super_admin?: boolean;
        }
      >(
        "SELECT id, name, email, password_hash, household_id, is_super_admin FROM users WHERE email = ?",
        [email]
      );
      return row ? toUserForAuth(row) : null;
    } catch (err) {
      // Backwards-compatible: older DBs won't have is_super_admin until migrations are applied.
      if (err && typeof err === "object" && "code" in err && err.code === "42703") {
        const row = await get<
          UserRow & { email: string; password_hash: string; household_id: number }
        >(
          "SELECT id, name, email, password_hash, household_id FROM users WHERE email = ?",
          [email]
        );
        return row ? toUserForAuth({ ...row, is_super_admin: false }) : null;
      }
      throw err;
    }
  }

  async getHouseholdId(userId: number): Promise<number> {
    const row = await get<{ household_id: number | null }>(
      "SELECT household_id FROM users WHERE id = ?",
      [userId]
    );
    if (!row) {
      throw new Error("User not found");
    }
    if (row.household_id == null) {
      throw new Error(
        'User is missing "household_id". Run `npm run db:push` to complete the household migration, then sign out and sign in again.'
      );
    }
    return row.household_id;
  }

  async getAuthState(
    userId: number
  ): Promise<{ householdId: number | null; isSuperAdmin: boolean } | null> {
    const row = await get<{ household_id: number | null; is_super_admin: boolean | null }>(
      "SELECT household_id, is_super_admin FROM users WHERE id = ?",
      [userId]
    );
    if (!row) return null;
    return {
      householdId: row.household_id == null ? null : Number(row.household_id),
      isSuperAdmin: row.is_super_admin === true,
    };
  }

  async createUser(input: {
    householdId: number;
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<number> {
    await run(
      "INSERT INTO users (name, email, password_hash, household_id, ai_feature_allowed, recon_feature_allowed) VALUES (?, ?, ?, ?, false, false)",
      [input.name, input.email, input.passwordHash, input.householdId]
    );
    const id = await lastInsertId();
    if (id == null) {
      throw new Error("User insert did not return an id");
    }
    return id;
  }

  async emailExists(email: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    const row = await get<{ id: number }>(
      "SELECT id FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1",
      [normalized]
    );
    return row != null;
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
      // Gate = household policy AND per-user allow. Admin portal sets the household
      // flag (households.recon_feature_allowed); the user row keeps the per-user opt-in.
      const row = await get<{ allowed: boolean | null }>(
        `SELECT (u.recon_feature_allowed AND h.recon_feature_allowed) AS allowed
         FROM users u
         JOIN households h ON h.id = u.household_id
         WHERE u.id = ?`,
        [userId]
      );
      return row?.allowed === true;
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
      // Gate = household policy AND per-user allow. Admin portal sets the household
      // flag (households.ai_feature_allowed); the user row keeps the per-user opt-in.
      const row = await get<{ allowed: boolean | null }>(
        `SELECT (u.ai_feature_allowed AND h.ai_feature_allowed) AS allowed
         FROM users u
         JOIN households h ON h.id = u.household_id
         WHERE u.id = ?`,
        [userId]
      );
      return row?.allowed === true;
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

  async getSetupWizardState(userId: number): Promise<SetupWizardState> {
    try {
      const row = await get<{
        setup_wizard_status: string | null;
        setup_wizard_dismissed_at: Date | string | null;
        setup_wizard_completed_at: Date | string | null;
      }>(
        "SELECT setup_wizard_status, setup_wizard_dismissed_at, setup_wizard_completed_at FROM users WHERE id = ?",
        [userId]
      );

      const rawStatus = row?.setup_wizard_status;
      const status: SetupWizardStatus = isSetupWizardStatus(rawStatus) ? rawStatus : "not_started";

      const dismissedAtRaw = row?.setup_wizard_dismissed_at ?? null;
      const completedAtRaw = row?.setup_wizard_completed_at ?? null;

      const dismissedAt = dismissedAtRaw ? new Date(dismissedAtRaw) : null;
      const completedAt = completedAtRaw ? new Date(completedAtRaw) : null;

      return { status, dismissedAt, completedAt };
    } catch (err) {
      // Backwards-compatible: older DBs won't have the columns until migrations are applied.
      if (err && typeof err === "object" && "code" in err && err.code === "42703") {
        return { status: "not_started", dismissedAt: null, completedAt: null };
      }
      throw err;
    }
  }

  async setSetupWizardStatus(userId: number, status: SetupWizardStatus): Promise<void> {
    const dismissedAt = status === "dismissed" ? new Date().toISOString() : null;
    const completedAt = status === "completed" ? new Date().toISOString() : null;
    try {
      await run(
        "UPDATE users SET setup_wizard_status = ?, setup_wizard_dismissed_at = ?, setup_wizard_completed_at = ? WHERE id = ?",
        [status, dismissedAt, completedAt, userId]
      );
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "42703") {
        throw new Error(
          'Database is missing setup wizard columns on "users". Run `npm run db:push` to apply migrations.'
        );
      }
      throw err;
    }
  }
}
