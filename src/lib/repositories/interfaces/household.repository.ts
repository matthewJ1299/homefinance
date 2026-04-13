export interface IHouseholdRepository {
  createHousehold(name: string): Promise<number>;
}
