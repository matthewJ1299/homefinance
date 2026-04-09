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
   * AI provider tier preference for this user.
   * - false: "Free AI" (default)
   * - true: "Paid AI"
   */
  getAiUsePaid(userId: number): Promise<boolean>;
  setAiUsePaid(userId: number, usePaid: boolean): Promise<void>;
}
