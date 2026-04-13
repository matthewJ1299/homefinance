import type { IAdminHouseholdRepository } from "@/lib/repositories/interfaces/admin-household.repository";
import type { IAdminUserRepository } from "@/lib/repositories/interfaces/admin-user.repository";

export interface IAdminFeaturePolicyService {
  setHouseholdPolicy(input: {
    householdId: number;
    aiFeatureAllowed: boolean;
    reconFeatureAllowed: boolean;
  }): Promise<void>;

  setUserOverrides(input: {
    userId: number;
    aiFeatureAllowed: boolean;
    reconFeatureAllowed: boolean;
  }): Promise<void>;
}

export class AdminFeaturePolicyService implements IAdminFeaturePolicyService {
  constructor(
    private readonly households: IAdminHouseholdRepository,
    private readonly users: IAdminUserRepository
  ) {}

  async setHouseholdPolicy(input: {
    householdId: number;
    aiFeatureAllowed: boolean;
    reconFeatureAllowed: boolean;
  }): Promise<void> {
    await this.households.updateFeaturePolicy(input.householdId, {
      aiFeatureAllowed: input.aiFeatureAllowed,
      reconFeatureAllowed: input.reconFeatureAllowed,
    });
  }

  async setUserOverrides(input: {
    userId: number;
    aiFeatureAllowed: boolean;
    reconFeatureAllowed: boolean;
  }): Promise<void> {
    // Current application gating is per-user; this keeps behavior stable while allowing
    // household-level policy to be introduced without breaking existing UX.
    await this.users.setUserFeatureAccess(input.userId, {
      aiFeatureAllowed: input.aiFeatureAllowed,
      reconFeatureAllowed: input.reconFeatureAllowed,
    });
  }
}

