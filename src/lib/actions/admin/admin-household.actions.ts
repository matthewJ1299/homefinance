"use server";

import { revalidatePath } from "next/cache";
import { withTransaction } from "@/lib/db";
import { bootstrapHouseholdDefaults } from "@/lib/db/bootstrap-household-defaults";
import { AdminHouseholdRepository } from "@/lib/repositories/sql/admin-household.repository";
import { AdminFeaturePolicyService } from "@/lib/services/admin/admin-feature-policy.service";
import { requireSuperAdminSession } from "@/lib/actions/admin/admin-auth";
import { createHouseholdSchema } from "@/lib/validators/admin.schema";
import { isFeatureKey, type FeatureKey } from "@/lib/features/registry";

export type AdminActionResult = { success: true } | { success: false; error: string };

export async function adminCreateHouseholdFormAction(formData: FormData): Promise<void> {
  await adminCreateHousehold(formData);
}

export async function adminRenameHouseholdFormAction(formData: FormData): Promise<void> {
  await adminRenameHousehold(formData);
}

export async function adminUpdateHouseholdEntitlementsFormAction(formData: FormData): Promise<void> {
  await adminUpdateHouseholdEntitlements(formData);
}

export async function adminSetHouseholdApprovalFormAction(formData: FormData): Promise<void> {
  await adminSetHouseholdApproval(formData);
}

export async function adminCreateHousehold(formData: FormData): Promise<AdminActionResult> {
  const authResult = await requireSuperAdminSession();
  if ("error" in authResult) return { success: false, error: authResult.error };

  const parsed = createHouseholdSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const repo = new AdminHouseholdRepository();
    const adminUserId = Number(authResult.session.user.id);
    await withTransaction(async () => {
      const id = await repo.createHousehold(parsed.data.name, "active");
      await bootstrapHouseholdDefaults(id);
      await repo.grantCoreFeatures(id, adminUserId);
    });
    revalidatePath("/admin/houses");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to create household" };
  }
}

export async function adminRenameHousehold(formData: FormData): Promise<AdminActionResult> {
  const authResult = await requireSuperAdminSession();
  if ("error" in authResult) return { success: false, error: authResult.error };

  const householdId = Number(formData.get("householdId"));
  const name = String(formData.get("name") ?? "").trim();
  if (!Number.isFinite(householdId) || !name) {
    return { success: false, error: "Invalid input" };
  }

  const repo = new AdminHouseholdRepository();
  await repo.renameHousehold(householdId, name);
  revalidatePath("/admin/houses");
  revalidatePath(`/admin/houses/${householdId}`);
  return { success: true };
}

export async function adminUpdateHouseholdEntitlements(formData: FormData): Promise<AdminActionResult> {
  const authResult = await requireSuperAdminSession();
  if ("error" in authResult) return { success: false, error: authResult.error };

  const householdId = Number(formData.get("householdId"));
  if (!Number.isFinite(householdId)) {
    return { success: false, error: "Invalid household" };
  }

  const enabledFeatures: FeatureKey[] = [];
  for (const [key] of formData.entries()) {
    if (key.startsWith("feature_") && formData.get(key) === "on") {
      const featureKey = key.slice("feature_".length);
      if (isFeatureKey(featureKey)) enabledFeatures.push(featureKey);
    }
  }
  const aiTier = formData.get("aiTier") === "paid" ? "paid" : "free";

  const households = new AdminHouseholdRepository();
  const policy = new AdminFeaturePolicyService(households);
  await policy.setEntitlements({
    householdId,
    enabledFeatures,
    aiTier,
    grantedByUserId: Number(authResult.session.user.id),
  });

  revalidatePath("/admin/houses");
  revalidatePath(`/admin/houses/${householdId}`);
  revalidatePath("/admin/features");
  return { success: true };
}

export async function adminSetHouseholdApproval(formData: FormData): Promise<AdminActionResult> {
  const authResult = await requireSuperAdminSession();
  if ("error" in authResult) return { success: false, error: authResult.error };

  const householdId = Number(formData.get("householdId"));
  const status = String(formData.get("status") ?? "");
  if (!Number.isFinite(householdId) || (status !== "active" && status !== "rejected")) {
    return { success: false, error: "Invalid input" };
  }

  const households = new AdminHouseholdRepository();
  const policy = new AdminFeaturePolicyService(households);
  await policy.setApprovalStatus(householdId, status);
  if (status === "active") {
    await households.grantCoreFeatures(householdId, Number(authResult.session.user.id));
  }
  revalidatePath("/admin/houses");
  revalidatePath(`/admin/houses/${householdId}`);
  return { success: true };
}
