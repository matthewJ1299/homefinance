"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { withTransaction } from "@/lib/db";
import { bootstrapHouseholdDefaults } from "@/lib/db/bootstrap-household-defaults";
import { AdminHouseholdRepository } from "@/lib/repositories/sql/admin-household.repository";
import { AdminUserRepository } from "@/lib/repositories/sql/admin-user.repository";
import { AdminUserProvisioningService } from "@/lib/services/admin/admin-user-provisioning.service";
import { PasswordService } from "@/lib/services/password.service";
import { requireSuperAdminSession } from "@/lib/actions/admin/admin-auth";
import {
  createHouseholdWithOwnerSchema,
  createUserInHouseholdSchema,
} from "@/lib/validators/admin.schema";
import type { AdminActionResult } from "@/lib/actions/admin/admin-household.actions";

function generateTempPassword(): string {
  return randomBytes(12).toString("base64url").slice(0, 16);
}

export async function adminCreateHouseholdAndOwner(formData: FormData): Promise<void> {
  await adminCreateHouseholdAndOwnerAction(formData);
}

export async function adminCreateUserInHousehold(formData: FormData): Promise<void> {
  await adminCreateUserInHouseholdAction(formData);
}

export async function adminSetUserSuperAdmin(formData: FormData): Promise<void> {
  await adminSetUserSuperAdminAction(formData);
}

export async function adminResetUserPassword(
  formData: FormData
): Promise<{ success: true; tempPassword: string } | { success: false; error: string }> {
  return adminResetUserPasswordAction(formData);
}

async function adminCreateHouseholdAndOwnerAction(formData: FormData): Promise<AdminActionResult> {
  const authResult = await requireSuperAdminSession();
  if ("error" in authResult) return { success: false, error: authResult.error };

  const parsed = createHouseholdWithOwnerSchema.safeParse({
    householdName: formData.get("householdName"),
    ownerName: formData.get("ownerName"),
    ownerEmail: formData.get("ownerEmail"),
    ownerPassword: formData.get("ownerPassword") || generateTempPassword(),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const households = new AdminHouseholdRepository();
    const users = new AdminUserRepository();
    const svc = new AdminUserProvisioningService(households, users);
    const adminUserId = Number(authResult.session.user.id);
    await withTransaction(async () => {
      await svc.createHouseholdWithOwnerUser({
        ...parsed.data,
        grantedByUserId: adminUserId,
      });
    });
    revalidatePath("/admin/users");
    revalidatePath("/admin/houses");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to create user" };
  }
}

async function adminCreateUserInHouseholdAction(formData: FormData): Promise<AdminActionResult> {
  const authResult = await requireSuperAdminSession();
  if ("error" in authResult) return { success: false, error: authResult.error };

  const parsed = createUserInHouseholdSchema.safeParse({
    householdId: Number(formData.get("householdId")),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password") || generateTempPassword(),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const households = new AdminHouseholdRepository();
    const users = new AdminUserRepository();
    const svc = new AdminUserProvisioningService(households, users);
    await svc.createUserInHousehold(parsed.data);
    revalidatePath("/admin/users");
    revalidatePath("/admin/houses");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to create user" };
  }
}

async function adminSetUserSuperAdminAction(formData: FormData): Promise<AdminActionResult> {
  const authResult = await requireSuperAdminSession();
  if ("error" in authResult) return { success: false, error: authResult.error };

  const userId = Number(formData.get("userId"));
  if (!Number.isFinite(userId)) return { success: false, error: "Invalid user" };

  const users = new AdminUserRepository();
  await users.setUserSuperAdmin(userId, formData.get("isSuperAdmin") === "on");
  revalidatePath("/admin/users");
  return { success: true };
}

async function adminResetUserPasswordAction(
  formData: FormData
): Promise<{ success: true; tempPassword: string } | { success: false; error: string }> {
  const authResult = await requireSuperAdminSession();
  if ("error" in authResult) return { success: false, error: authResult.error };

  const userId = Number(formData.get("userId"));
  if (!Number.isFinite(userId)) return { success: false, error: "Invalid user" };

  const tempPassword = await new PasswordService().adminResetPassword(userId);
  revalidatePath("/admin/users");
  return { success: true, tempPassword };
}

export async function adminMoveUserHouseholdFormAction(formData: FormData): Promise<void> {
  await adminMoveUserHouseholdAction(formData);
}

async function adminMoveUserHouseholdAction(formData: FormData): Promise<AdminActionResult> {
  const authResult = await requireSuperAdminSession();
  if ("error" in authResult) return { success: false, error: authResult.error };

  const userId = Number(formData.get("userId"));
  const householdId = Number(formData.get("householdId"));
  if (!Number.isFinite(userId) || !Number.isFinite(householdId)) {
    return { success: false, error: "Invalid input" };
  }

  const users = new AdminUserRepository();
  await users.moveUserToHousehold(userId, householdId);
  revalidatePath("/admin/users");
  return { success: true };
}
