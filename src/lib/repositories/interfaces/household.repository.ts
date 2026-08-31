export interface IHouseholdRepository {
  createHousehold(name: string): Promise<number>;
  /**
   * All household ids, ascending. System/cron use only (no tenant context required)
   * so background jobs can iterate households and bind request context per household.
   */
  listAllHouseholdIds(): Promise<number[]>;
}
