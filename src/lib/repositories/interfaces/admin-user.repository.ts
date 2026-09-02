export interface AdminUserSummary {
  id: number;
  name: string;
  email: string;
  householdId: number;
  isSuperAdmin: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface IAdminUserRepository {
  listUsers(filter?: { householdId?: number; search?: string }): Promise<AdminUserSummary[]>;
  createUser(input: {
    householdId: number;
    name: string;
    email: string;
    passwordHash: string;
    mustChangePassword?: boolean;
  }): Promise<number>;
  setUserSuperAdmin(userId: number, isSuperAdmin: boolean): Promise<void>;
  moveUserToHousehold(userId: number, householdId: number): Promise<void>;
}
