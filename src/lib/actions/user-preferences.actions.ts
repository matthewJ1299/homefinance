"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { getHouseholdRepository, getUserRepository } from "@/lib/repositories";
import { normalizeBudgetMonthStartDay } from "@/lib/utils/date";
import { clearBudgetMonthStartDayMemo } from "@/lib/db/request-context";
import { isSetupWizardStatus, type SetupWizardStatus } from "@/lib/repositories/interfaces/user.repository";
import { isOnboardingStep } from "@/lib/onboarding/steps";

export type UpdateBudgetMonthStartDayResult =
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
