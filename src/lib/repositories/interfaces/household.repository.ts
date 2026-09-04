export interface HouseholdSummary {
  id: number;
  name: string;
  budgetMonthStartDay: number;
  /** True where members previously disagreed on the start day. Shown once. */
  budgetMonthNoticePending: boolean;
}

export interface IHouseholdRepository {
  createHousehold(name: string): Promise<number>;
  getCurrent(): Promise<HouseholdSummary | null>;
  rename(name: string): Promise<void>;
  /**
   * The household's budget month start day. Two people looking at different
   * budget months is the bug this replaced.
   */
  getBudgetMonthStartDay(): Promise<number>;
  setBudgetMonthStartDay(day: number): Promise<void>;
  clearBudgetMonthNotice(): Promise<void>;
  /**
   * All household ids, ascending. System/cron use only (no tenant context required)
   * so background jobs can iterate households and bind request context per household.
   */
  listAllHouseholdIds(): Promise<number[]>;
}
