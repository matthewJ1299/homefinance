import type { FeatureKey } from "@/lib/features/registry";
import type { HouseholdApprovalStatus } from "@/lib/db/request-context";

export interface UserSummary {
  id: number;
  name: string;
}

export interface UserForAuth {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  householdId: number;
  isSuperAdmin: boolean;
}

export type SetupWizardStatus = "not_started" | "in_progress" | "dismissed" | "completed";

export interface SetupWizardState {
  status: SetupWizardStatus;
  /** Resumable onboarding step (`users.setup_wizard_step`). Null when not set. */
  step: string | null;
  dismissedAt: Date | null;
  completedAt: Date | null;
}

export interface UserAuthState {
  householdId: number | null;
  isSuperAdmin: boolean;
  featureKeys: FeatureKey[];
  aiTier: "free" | "paid";
  householdApprovalStatus: HouseholdApprovalStatus;
  mustChangePassword: boolean;
}

export interface IUserRepository {
  findAll(): Promise<UserSummary[]>;
  findAllExcept(userId: number): Promise<UserSummary[]>;
  findById(id: number): Promise<UserSummary | null>;
  findByEmailForAuth(email: string): Promise<UserForAuth | null>;
  /** households.id for this user (one household per user). */
  getHouseholdId(userId: number): Promise<number>;
  /**
   * Authoritative tenant + role, read fresh from the DB rather than the JWT.
   * Used to bind request context so an admin revoking super-admin (or moving a
   * user between households) takes effect on the next request, not after the
   * 30-day JWT expires. Returns null when the user row is gone.
   */
  getAuthState(userId: number): Promise<UserAuthState | null>;
  createUser(input: {
    householdId: number;
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<number>;
  /** True if any row uses this email (case-insensitive trim). */
  emailExists(email: string): Promise<boolean>;
  /** Day of month (1-28) when the budget period starts; period ends the day before the next period. Default 1 = calendar month. */
  getBudgetMonthStartDay(userId: number): Promise<number>;
  updateBudgetMonthStartDay(userId: number, day: number): Promise<void>;
  /** Dashboard default spending account; null if none set or no accounts. */
  getPrimaryAccountId(userId: number): Promise<number | null>;
  setPrimaryAccountId(userId: number, accountId: number | null): Promise<void>;

  /** Setup wizard state for this user (cross-device). */
  getSetupWizardState(userId: number): Promise<SetupWizardState>;
  setSetupWizardStatus(userId: number, status: SetupWizardStatus): Promise<void>;
  /** Persist the current onboarding step for resume (`users.setup_wizard_step`). */
  setSetupWizardStep(userId: number, step: string | null): Promise<void>;
}
