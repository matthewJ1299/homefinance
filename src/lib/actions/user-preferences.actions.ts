"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { getHouseholdRepository, getUserRepository } from "@/lib/repositories";
import { normalizeBudgetMonthStartDay } from "@/lib/utils/date";
import { clearBudgetMonthStartDayMemo } from "@/lib/db/request-context";
import { isSetupWizardStatus, type SetupWizardStatus } from "@/lib/repositories/interfaces/user.repository";
import { isOnboardingStep } from "@/lib/onboarding/steps";
import { isHomeMode, type HomeMode } from "@/lib/features/home-mode";

export type UpdateBudgetMonthStartDayResult =
  | { success: true }
  | { success: false; error: string };

export type UpdateHomeModeResult =
  | { success: true }
  | { success: false; error: string };

export type UpdateSetupWizardStatusResult =
  | { success: true }
  | { success: false; error: string };

export type UpdateSetupWizardStepResult =
  | { success: true }
  | { success: false; error: string };

export async function updateBudgetMonthStartDayAction(
  day: number
): Promise<UpdateBudgetMonthStartDayResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  setRequestContextFromSession(session);
  const userId = Number(session.user.id);
  const normalized = normalizeBudgetMonthStartDay(day);
  // Household-level since migration 0042: two people looking at different
  // budget months is the bug this replaced. The users column is left written
  // for one release so the migration stays reversible.
  await getHouseholdRepository().setBudgetMonthStartDay(normalized);
  clearBudgetMonthStartDayMemo();
  await getHouseholdRepository().clearBudgetMonthNotice();
  await getUserRepository().updateBudgetMonthStartDay(userId, normalized);
  revalidatePath("/dashboard");
  revalidatePath("/budget");
  revalidatePath("/expenses");
  revalidatePath("/income");
  revalidatePath("/reports");
  revalidatePath("/settings");
  return { success: true };
}

/**
 * Switch the current user between envelope budgeting and plain tracking. A
 * per-user preference (never touches the household or the partner's view) and
 * non-destructive -- the budget rows stay and reappear on switching back.
 */
export async function updateHomeModeAction(mode: HomeMode): Promise<UpdateHomeModeResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  setRequestContextFromSession(session);

  if (!isHomeMode(mode)) {
    return { success: false, error: "Invalid home mode." };
  }

  const userId = Number(session.user.id);
  try {
    await getUserRepository().setHomeMode(userId, mode);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update home mode.";
    return { success: false, error: message };
  }

  // The nav lives in the shared app layout, and these budget-cluster pages guard
  // on the mode, so revalidate all of them.
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/budget");
  revalidatePath("/goals");
  revalidatePath("/budget-ai-report");
  return { success: true };
}

export async function updateSetupWizardStatusAction(
  status: SetupWizardStatus
): Promise<UpdateSetupWizardStatusResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  setRequestContextFromSession(session);

  if (!isSetupWizardStatus(status)) {
    return { success: false, error: "Invalid onboarding status." };
  }

  const userId = Number(session.user.id);
  const repo = getUserRepository();
  try {
    const current = await repo.getSetupWizardState(userId);
    if (current.status === "completed" && status !== "completed") {
      return { success: true };
    }
    await repo.setSetupWizardStatus(userId, status);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update setup wizard state.";
    return { success: false, error: message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/welcome");
  return { success: true };
}

export async function updateSetupWizardStepAction(
  step: string | null
): Promise<UpdateSetupWizardStepResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  setRequestContextFromSession(session);

  if (step != null && !isOnboardingStep(step)) {
    return { success: false, error: "Invalid onboarding step." };
  }

  const userId = Number(session.user.id);
  try {
    await getUserRepository().setSetupWizardStep(userId, step);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update onboarding step.";
    return { success: false, error: message };
  }

  revalidatePath("/welcome");
  revalidatePath("/dashboard");
  return { success: true };
}
