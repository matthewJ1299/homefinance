export interface AdminHouseholdSummary {
  id: number;
  name: string;
  aiFeatureAllowed: boolean;
  reconFeatureAllowed: boolean;
  createdAt: string;
}

export interface IAdminHouseholdRepository {
  listHouseholds(): Promise<AdminHouseholdSummary[]>;
  createHousehold(name: string): Promise<number>;
  updateFeaturePolicy(
    householdId: number,
    policy: { aiFeatureAllowed: boolean; reconFeatureAllowed: boolean }
  ): Promise<void>;
}

