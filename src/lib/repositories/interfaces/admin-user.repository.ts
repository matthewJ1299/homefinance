export interface AdminUserSummary {
  id: number;
  name: string;
  email: string;
  householdId: number;
  isSuperAdmin: boolean;
  aiFeatureAllowed: boolean;
  reconFeatureAllowed: boolean;
  aiEnabled: boolean;
  reconEnabled: boolean;
  createdAt: string;
}

export interface IAdminUserRepository {
  listUsers(filter?: { householdId?: number }): Promise<AdminUserSummary[]>;
  createUser(input: {
    householdId: number;
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<number>;
  setUserFeatureAccess(
    userId: number,
    access: { aiFeatureAllowed: boolean; reconFeatureAllowed: boolean }
  ): Promise<void>;
  setUserSuperAdmin(userId: number, isSuperAdmin: boolean): Promise<void>;
}

