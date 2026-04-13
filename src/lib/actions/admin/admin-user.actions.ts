"use server";

import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { requireSuperAdmin } from "@/lib/db/request-context";
import { AdminHouseholdRepository } from "@/lib/repositories/sql/admin-household.repository";
import { AdminUserRepository } from "@/lib/repositories/sql/admin-user.repository";
import { AdminUserProvisioningService } from "@/lib/services/admin/admin-user-provisioning.service";

export async function adminCreateHouseholdAndOwner(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  setRequestContextFromSession(session);
  requireSuperAdmin();

  const householdName = String(formData.get("householdName") ?? "").trim();
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim();
  const ownerPassword = String(formData.get("ownerPassword") ?? "").trim();

  if (!householdName || !ownerName || !ownerEmail || !ownerPassword) {
    throw new Error("All fields are required");
  }

  const households = new AdminHouseholdRepository();
  const users = new AdminUserRepository();
  const svc = new AdminUserProvisioningService(households, users);
  await svc.createHouseholdWithOwnerUser({
    householdName,
    ownerName,
    ownerEmail,
    ownerPassword,
  });
}

export async function adminCreateUserInHousehold(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  setRequestContextFromSession(session);
  requireSuperAdmin();

  const householdId = Number(formData.get("householdId"));
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!Number.isFinite(householdId) || !name || !email || !password) {
    throw new Error("Invalid input");
  }

  const households = new AdminHouseholdRepository();
  const users = new AdminUserRepository();
  const svc = new AdminUserProvisioningService(households, users);
  await svc.createUserInHousehold({ householdId, name, email, password });
}

export async function adminSetUserSuperAdmin(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  setRequestContextFromSession(session);
  requireSuperAdmin();

  const userId = Number(formData.get("userId"));
  if (!Number.isFinite(userId)) {
    throw new Error("Invalid userId");
  }
  const isSuperAdmin = formData.get("isSuperAdmin") === "on";
  const users = new AdminUserRepository();
  await users.setUserSuperAdmin(userId, isSuperAdmin);
}

export async function adminSetUserFeatureAccess(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  setRequestContextFromSession(session);
  requireSuperAdmin();

  const userId = Number(formData.get("userId"));
  if (!Number.isFinite(userId)) {
    throw new Error("Invalid userId");
  }
  const aiFeatureAllowed = formData.get("aiFeatureAllowed") === "on";
  const reconFeatureAllowed = formData.get("reconFeatureAllowed") === "on";
  const users = new AdminUserRepository();
  await users.setUserFeatureAccess(userId, { aiFeatureAllowed, reconFeatureAllowed });
}

