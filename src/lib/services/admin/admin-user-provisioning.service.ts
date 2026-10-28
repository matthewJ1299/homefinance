import bcrypt from "bcryptjs";
import { withTransaction } from "@/lib/db";
import { bootstrapHouseholdDefaults } from "@/lib/db/bootstrap-household-defaults";
import { getUserRepository } from "@/lib/repositories";
import type { IAdminHouseholdRepository } from "@/lib/repositories/interfaces/admin-household.repository";
import type { IAdminUserRepository } from "@/lib/repositories/interfaces/admin-user.repository";

export interface IAdminUserProvisioningService {
  createHouseholdWithOwnerUser(input: {
    householdName: string;
    ownerName: string;
    ownerEmail: string;
    ownerPassword: string;
    grantedByUserId: number;
  }): Promise<{ householdId: number; userId: number }>;

  createUserInHousehold(input: {
    householdId: number;
    name: string;
    email: string;
    password: string;
  }): Promise<{ userId: number }>;
}

export class AdminUserProvisioningService implements IAdminUserProvisioningService {
  constructor(
    private readonly households: IAdminHouseholdRepository,
    private readonly users: IAdminUserRepository
  ) {}

  async createHouseholdWithOwnerUser(input: {
    householdName: string;
    ownerName: string;
    ownerEmail: string;
    ownerPassword: string;
    grantedByUserId: number;
  }): Promise<{ householdId: number; userId: number }> {
    const userRepo = getUserRepository();
    const exists = await userRepo.emailExists(input.ownerEmail);
    if (exists) {
      throw new Error("Email already exists");
    }

    let householdId = 0;
    let userId = 0;
    await withTransaction(async () => {
      householdId = await this.households.createHousehold(input.householdName, "active");
      await bootstrapHouseholdDefaults(householdId);
      await this.households.grantCoreFeatures(householdId, input.grantedByUserId);
      const passwordHash = await bcrypt.hash(input.ownerPassword, 10);
      userId = await this.users.createUser({
        householdId,
        name: input.ownerName,
        email: input.ownerEmail,
        passwordHash,
        mustChangePassword: true,
      });
    });
    return { householdId, userId };
  }

  async createUserInHousehold(input: {
    householdId: number;
    name: string;
    email: string;
    password: string;
  }): Promise<{ userId: number }> {
    const userRepo = getUserRepository();
    const exists = await userRepo.emailExists(input.email);
    if (exists) {
      throw new Error("Email already exists");
    }
    const passwordHash = await bcrypt.hash(input.password, 10);
    const userId = await this.users.createUser({
      householdId: input.householdId,
      name: input.name,
      email: input.email,
      passwordHash,
      mustChangePassword: true,
    });
    return { userId };
  }
}
