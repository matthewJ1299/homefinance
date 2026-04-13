"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { getUserRepository } from "@/lib/repositories";
import { normalizeBudgetMonthStartDay } from "@/lib/utils/date";
import { isAIConfiguredForTier } from "@/lib/services/ai.service";
import type { SetupWizardStatus } from "@/lib/repositories/interfaces/user.repository";

export type UpdateBudgetMonthStartDayResult =
  | { success: true }
  | { success: false; error: string };

export type UpdateReconEnabledResult =
  | { success: true }
  | { success: false; error: string };

export type UpdateAiUsePaidResult =
  | { success: true }
  | { success: false; error: string };

export type UpdateAiEnabledResult =
  | { success: true }
  | { success: false; error: string };

export type UpdateSetupWizardStatusResult =
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
  await getUserRepository().updateBudgetMonthStartDay(userId, normalized);
  revalidatePath("/dashboard");
  revalidatePath("/budget");
  revalidatePath("/expenses");
  revalidatePath("/income");
  revalidatePath("/summary");
  revalidatePath("/settings");
  return { success: true };
}

export async function updateReconEnabledAction(enabled: boolean): Promise<UpdateReconEnabledResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  setRequestContextFromSession(session);
  const userId = Number(session.user.id);
  const reconFeatureAllowed = await getUserRepository().getReconFeatureAllowed(userId);
  if (!reconFeatureAllowed) {
    return {
      success: false,
      error: "Recon is not enabled for your account. An administrator can grant access.",
    };
  }
  try {
    await getUserRepository().setReconEnabled(userId, enabled);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update Recon setting.";
    return { success: false, error: message };
  }
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/recon");
  return { success: true };
}

export async function updateAiUsePaidAction(usePaid: boolean): Promise<UpdateAiUsePaidResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  setRequestContextFromSession(session);

  const userId = Number(session.user.id);
  const aiFeatureAllowed = await getUserRepository().getAiFeatureAllowed(userId);
  if (!aiFeatureAllowed) {
    return {
      success: false,
      error: "AI analysis is not enabled for your account. An administrator can grant access.",
    };
  }

  if (usePaid && !isAIConfiguredForTier("paid")) {
    return {
      success: false,
      error:
        "Paid AI is not configured on this server. Set OPENAI_API_KEY (optional OPENAI_MODEL) or set GEMINI_PAID_API_KEY (optional GEMINI_PAID_MODEL) in the environment.",
    };
  }

  try {
    await getUserRepository().setAiUsePaid(userId, usePaid);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update AI preference.";
    return { success: false, error: message };
  }
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/summary");
  return { success: true };
}

export async function updateAiEnabledAction(enabled: boolean): Promise<UpdateAiEnabledResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  setRequestContextFromSession(session);

  const userId = Number(session.user.id);
  const aiFeatureAllowed = await getUserRepository().getAiFeatureAllowed(userId);
  if (!aiFeatureAllowed) {
    return {
      success: false,
      error: "AI analysis is not enabled for your account. An administrator can grant access.",
    };
  }
  try {
    await getUserRepository().setAiEnabled(userId, enabled);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update AI setting.";
    return { success: false, error: message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/summary");
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

  const userId = Number(session.user.id);
  try {
    await getUserRepository().setSetupWizardStatus(userId, status);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update setup wizard state.";
    return { success: false, error: message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { success: true };
}
