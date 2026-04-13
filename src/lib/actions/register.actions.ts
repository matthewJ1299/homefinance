"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { bootstrapHouseholdDefaults } from "@/lib/db/bootstrap-household-defaults";
import { getHouseholdRepository, getUserRepository } from "@/lib/repositories";

const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

export type RegisterHouseholdResult =
  | { ok: true }
  | { ok: false; error: string };

export async function registerNewHouseholdAction(input: unknown): Promise<RegisterHouseholdResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please provide a valid name, email, and password (at least 8 characters)." };
  }

  const userRepo = getUserRepository();
  const normalizedEmail = parsed.data.email.toLowerCase();
  if (await userRepo.emailExists(normalizedEmail)) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const householdRepo = getHouseholdRepository();
  const householdName = `${parsed.data.name} household`;
  const householdId = await householdRepo.createHousehold(householdName);
  await bootstrapHouseholdDefaults(householdId);

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await userRepo.createUser({
    householdId,
    name: parsed.data.name,
    email: normalizedEmail,
    passwordHash,
  });

  return { ok: true };
}
