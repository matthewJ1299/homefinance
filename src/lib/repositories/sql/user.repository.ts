import { all, get, run, lastInsertId } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import { normalizeBudgetMonthStartDay } from "@/lib/utils/date";
import { toFeatureKeys } from "@/lib/features/registry";
import { toHomeMode, type HomeMode } from "@/lib/features/home-mode";
import type { HouseholdApprovalStatus } from "@/lib/db/request-context";
import type { UserSummary, UserForAuth, UserAuthState } from "../interfaces/user.repository";
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
  /**
   * Tenant-scoped name lookup. Replaces a raw `SELECT id, name FROM users WHERE
   * id IN (...)` that lived in BudgetService and carried no household filter --
   * the one user query in the codebase that could have crossed tenants.
   */
  async getFeedbackLastSeenAt(userId: number): Promise<string | null> {
    const hid = requireHouseholdId();
    const row = await get<{ feedback_last_seen_at: string | null }>(
      "SELECT feedback_last_seen_at FROM users WHERE id = ? AND household_id = ?",
      [userId, hid]
    );
    return row?.feedback_last_seen_at ?? null;
  }

  async markFeedbackSeen(userId: number): Promise<void> {
    const hid = requireHouseholdId();
    // NOW() rather than a client timestamp, so the marker is on the same clock
    // as the feedback rows it is compared against.
    await run(
      "UPDATE users SET feedback_last_seen_at = NOW() WHERE id = ? AND household_id = ?",
      [userId, hid]
    );
  }

  async getPasswordHash(userId: number): Promise<string | null> {
    const row = await get<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE id = ?",
      [userId]
    );
    return row?.password_hash ?? null;
  }

  async setPasswordHash(
    userId: number,
    passwordHash: string,
    options: { mustChangePassword: boolean }
  ): Promise<void> {
    // password_changed_at records when the USER last chose one, so an admin
    // reset clears it rather than stamping now.
    await run(
      `UPDATE users
          SET password_hash = ?,
              must_change_password = ?,
              password_changed_at = ${options.mustChangePassword ? "NULL" : "NOW()"}
        WHERE id = ?`,
      [passwordHash, options.mustChangePassword, userId]
    );
  }

  async namesByIds(userIds: number[]): Promise<Map<number, string>> {
    const hid = requireHouseholdId();
    const unique = [...new Set(userIds.filter((id) => Number.isInteger(id) && id > 0))];
    if (unique.length === 0) return new Map();
    const placeholders = unique.map(() => "?").join(", ");
    const rows = await all<{ id: number; name: string }>(
      `SELECT id, name FROM users WHERE household_id = ? AND id IN (${placeholders})`,
      [hid, ...unique]
    );
    return new Map(rows.map((r) => [r.id, r.name]));
  }

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

  async getAuthState(userId: number): Promise<UserAuthState | null> {
    try {
      const row = await get<{
        household_id: number | null;
        is_super_admin: boolean | null;
        must_change_password: boolean | null;
        ai_tier: string | null;
        approval_status: string | null;
        feature_keys: string[] | null;
        home_mode: string | null;
      }>(
        `SELECT u.household_id,
                u.is_super_admin,
                u.must_change_password,
                u.home_mode,
                COALESCE(h.ai_tier, 'free') AS ai_tier,
                COALESCE(h.approval_status, 'active') AS approval_status,
                COALESCE(
                  (SELECT array_agg(hf.feature_key)
                     FROM household_features hf
                    WHERE hf.household_id = u.household_id
                      AND hf.enabled
                      AND (hf.expires_at IS NULL OR hf.expires_at > NOW())),
                  '{}'::text[]
                ) AS feature_keys
           FROM users u
           LEFT JOIN households h ON h.id = u.household_id
          WHERE u.id = ?`,
        [userId]
      );
      if (!row) return null;
      const approvalRaw = row.approval_status;
      const householdApprovalStatus: HouseholdApprovalStatus =
        approvalRaw === "pending" || approvalRaw === "rejected" ? approvalRaw : "active";
      return {
        householdId: row.household_id == null ? null : Number(row.household_id),
        isSuperAdmin: row.is_super_admin === true,
        featureKeys: toFeatureKeys(row.feature_keys ?? []),
        aiTier: row.ai_tier === "paid" ? "paid" : "free",
        householdApprovalStatus,
        mustChangePassword: row.must_change_password === true,
        homeMode: toHomeMode(row.home_mode),
      };
    } catch (err) {
      if (err && typeof err === "object" && "code" in err) {
        const code = String(err.code);
        if (code === "42P01" || code === "42703") {
          const row = await get<{ household_id: number | null; is_super_admin: boolean | null }>(
            "SELECT household_id, is_super_admin FROM users WHERE id = ?",
            [userId]
          );
          if (!row) return null;
          return {
            householdId: row.household_id == null ? null : Number(row.household_id),
            isSuperAdmin: row.is_super_admin === true,
            featureKeys: [],
            aiTier: "free",
            householdApprovalStatus: "active",
            mustChangePassword: false,
            homeMode: "budget",
          };
        }
      }
      throw err;
    }
  }

  async createUser(input: {
    householdId: number;
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<number> {
    await run(
      "INSERT INTO users (name, email, password_hash, household_id) VALUES (?, ?, ?, ?)",
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

  async getHomeMode(userId: number): Promise<HomeMode> {
    try {
      const row = await get<{ home_mode: string | null }>(
        "SELECT home_mode FROM users WHERE id = ?",
        [userId]
      );
      return toHomeMode(row?.home_mode);
    } catch (err) {
      // Older DBs won't have the column until migration 0053 is applied.
      if (err && typeof err === "object" && "code" in err && err.code === "42703") {
        return "budget";
      }
      throw err;
    }
  }

  async setHomeMode(userId: number, mode: HomeMode): Promise<void> {
    await run("UPDATE users SET home_mode = ? WHERE id = ?", [mode, userId]);
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

  async getSetupWizardState(userId: number): Promise<SetupWizardState> {
    try {
      const row = await get<{
        setup_wizard_status: string | null;
        setup_wizard_step: string | null;
        setup_wizard_dismissed_at: Date | string | null;
        setup_wizard_completed_at: Date | string | null;
      }>(
        "SELECT setup_wizard_status, setup_wizard_step, setup_wizard_dismissed_at, setup_wizard_completed_at FROM users WHERE id = ?",
        [userId]
      );

      const rawStatus = row?.setup_wizard_status;
      const status: SetupWizardStatus = isSetupWizardStatus(rawStatus) ? rawStatus : "not_started";

      const dismissedAtRaw = row?.setup_wizard_dismissed_at ?? null;
      const completedAtRaw = row?.setup_wizard_completed_at ?? null;

      const dismissedAt = dismissedAtRaw ? new Date(dismissedAtRaw) : null;
      const completedAt = completedAtRaw ? new Date(completedAtRaw) : null;

      return {
        status,
        step: row?.setup_wizard_step ?? null,
        dismissedAt,
        completedAt,
      };
    } catch (err) {
      // Backwards-compatible: older DBs won't have the columns until migrations are applied.
      if (err && typeof err === "object" && "code" in err && err.code === "42703") {
        return { status: "not_started", step: null, dismissedAt: null, completedAt: null };
      }
      throw err;
    }
  }

  async setSetupWizardStatus(userId: number, status: SetupWizardStatus): Promise<void> {
    const dismissedAt = status === "dismissed" ? new Date().toISOString() : null;
    const completedAt = status === "completed" ? new Date().toISOString() : null;
    const clearStep = status === "completed";
    try {
      await run(
        "UPDATE users SET setup_wizard_status = ?, setup_wizard_dismissed_at = ?, setup_wizard_completed_at = ?, setup_wizard_step = CASE WHEN ? THEN NULL ELSE setup_wizard_step END WHERE id = ?",
        [status, dismissedAt, completedAt, clearStep, userId]
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

  async setSetupWizardStep(userId: number, step: string | null): Promise<void> {
    try {
      await run("UPDATE users SET setup_wizard_step = ? WHERE id = ?", [step, userId]);
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "42703") {
        throw new Error(
          'Database is missing column "users.setup_wizard_step". Run `npm run db:push` to apply migrations.'
        );
      }
      throw err;
    }
  }
}
