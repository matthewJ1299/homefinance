export interface UserSummary {
  id: number;
  name: string;
}

export interface UserForAuth {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
}

export interface IUserRepository {
  findAll(): Promise<UserSummary[]>;
  findAllExcept(userId: number): Promise<UserSummary[]>;
  findById(id: number): Promise<UserSummary | null>;
  findByEmailForAuth(email: string): Promise<UserForAuth | null>;
  /** Day of month (1-28) when the budget period starts; period ends the day before the next period. Default 1 = calendar month. */
  getBudgetMonthStartDay(userId: number): Promise<number>;
  updateBudgetMonthStartDay(userId: number, day: number): Promise<void>;
  /** Dashboard default spending account; null if none set or no accounts. */
  getPrimaryAccountId(userId: number): Promise<number | null>;
  setPrimaryAccountId(userId: number, accountId: number | null): Promise<void>;
  /** Bank email reconciliation (Recon). Off until enabled in Settings. */
  getReconEnabled(userId: number): Promise<boolean>;
  setReconEnabled(userId: number, enabled: boolean): Promise<void>;
  /**
   * Admin-style gate: user may use Recon at all (Outlook connect, sync, APIs).
   * Independent of {@link getReconEnabled} (user preference). Intended for a future admin UI.
   */
  getReconFeatureAllowed(userId: number): Promise<boolean>;
  setReconFeatureAllowed(userId: number, allowed: boolean): Promise<void>;
  /** AI features toggle. Off until enabled in Settings. */
  getAiEnabled(userId: number): Promise<boolean>;
  setAiEnabled(userId: number, enabled: boolean): Promise<void>;
  /**
   * Admin-style gate: user may use AI analysis at all (API + Settings toggles).
   * Independent of {@link getAiEnabled} (user preference). Intended for a future admin UI.
   */
  getAiFeatureAllowed(userId: number): Promise<boolean>;
  setAiFeatureAllowed(userId: number, allowed: boolean): Promise<void>;
  /**
   * AI provider tier preference for this user.
   * - false: "Free AI" (default)
   * - true: "Paid AI"
   */
  getAiUsePaid(userId: number): Promise<boolean>;
  setAiUsePaid(userId: number, usePaid: boolean): Promise<void>;
}
