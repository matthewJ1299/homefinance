"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { setRequestContext } from "@/lib/db/request-context";
import { getUserRepository } from "@/lib/repositories";
import { normalizeBudgetMonthStartDay } from "@/lib/utils/date";
import { isAIConfiguredForTier } from "@/lib/services/ai.service";

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

export type UpdateOwedToMeEnabledResult =
  | { success: true }
  | { success: false; error: string };

export async function updateBudgetMonthStartDayAction(
  day: number
): Promise<UpdateBudgetMonthStartDayResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  setRequestContext({ userId: session.user.id, userName: session.user.name ?? undefined });
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
  setRequestContext({ userId: session.user.id, userName: session.user.name ?? undefined });
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
  setRequestContext({ userId: session.user.id, userName: session.user.name ?? undefined });

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
  setRequestContext({ userId: session.user.id, userName: session.user.name ?? undefined });

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

export async function updateOwedToMeEnabledAction(
  enabled: boolean
): Promise<UpdateOwedToMeEnabledResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  setRequestContext({ userId: session.user.id, userName: session.user.name ?? undefined });
  const userId = Number(session.user.id);
  try {
    await getUserRepository().setOwedToMeEnabled(userId, enabled);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update Owed to me setting.";
    return { success: false, error: message };
  }
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/owed-to-me");
  return { success: true };
}
