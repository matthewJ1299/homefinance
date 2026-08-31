"use server";

import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { requireSuperAdmin } from "@/lib/db/request-context";
import { bootstrapHouseholdDefaults } from "@/lib/db/bootstrap-household-defaults";
import { AdminHouseholdRepository } from "@/lib/repositories/sql/admin-household.repository";

export async function adminCreateHousehold(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  setRequestContextFromSession(session);
  requireSuperAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    throw new Error("Household name is required");
  }

  const repo = new AdminHouseholdRepository();
  const id = await repo.createHousehold(name);
  // Default split group + categories, or the household's users land in an unusable app.
  await bootstrapHouseholdDefaults(id);
}

export async function adminUpdateHouseholdPolicy(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  setRequestContextFromSession(session);
  requireSuperAdmin();

  const householdId = Number(formData.get("householdId"));
  if (!Number.isFinite(householdId)) {
    throw new Error("Invalid householdId");
  }
  const aiFeatureAllowed = formData.get("aiFeatureAllowed") === "on";
  const reconFeatureAllowed = formData.get("reconFeatureAllowed") === "on";

  const repo = new AdminHouseholdRepository();
  await repo.updateFeaturePolicy(householdId, { aiFeatureAllowed, reconFeatureAllowed });
}

