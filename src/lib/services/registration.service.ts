import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS } from "@/lib/services/password.service";
import { withTransaction } from "@/lib/db";
import { bootstrapHouseholdDefaults } from "@/lib/db/bootstrap-household-defaults";
import { getUserRepository } from "@/lib/repositories";
import { AdminHouseholdRepository } from "@/lib/repositories/sql/admin-household.repository";
import { AdminUserRepository } from "@/lib/repositories/sql/admin-user.repository";

export class RegistrationService {
  async registerPendingHousehold(input: {
    householdName: string;
    name: string;
    email: string;
    password: string;
  }): Promise<{ success: true } | { success: false; error: string }> {
    const userRepo = getUserRepository();
    if (await userRepo.emailExists(input.email)) {
      return { success: false, error: "An account with this email already exists" };
    }

    const households = new AdminHouseholdRepository();
    const users = new AdminUserRepository();
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    try {
      await withTransaction(async () => {
        const householdId = await households.createHousehold(input.householdName, "pending");
        await bootstrapHouseholdDefaults(householdId);
        await users.createUser({
          householdId,
          name: input.name,
          email: input.email,
          passwordHash,
          mustChangePassword: false,
        });
      });
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Registration failed",
      };
    }
  }
}
