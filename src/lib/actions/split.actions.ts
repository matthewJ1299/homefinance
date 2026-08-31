"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { SplitService } from "@/lib/services/split.service";
import { getUserRepository, getSplitSettlementRepository } from "@/lib/repositories";
import { formatRand } from "@/lib/utils/currency";
import { settleSplitSchema, updateSettlementSchema, deleteSettlementSchema } from "@/lib/validators/split.schema";
import type { SplitBalance, SplitHistoryItem } from "@/lib/types";

export type SettleSplitResult = { success: true } | { success: false; error: string };

export async function getSplitBalance(groupId?: number): Promise<
  { success: true; balance: SplitBalance } | { success: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  setRequestContextFromSession(session);
  const splitService = new SplitService();
  const balance = await splitService.getBalance(Number(session.user.id), groupId);
  return { success: true, balance };
}

export async function getSplitHistory(groupId?: number): Promise<
  { success: true; history: SplitHistoryItem[] } | { success: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  setRequestContextFromSession(session);
  const splitService = new SplitService();
  const history = await splitService.getSplitHistory(Number(session.user.id), groupId);
  return { success: true, history };
}

export async function settleSplit(formData: {
  recipientUserId: number;
  amountCents: number;
  date?: string;
  groupId: number;
}): Promise<SettleSplitResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  setRequestContextFromSession(session);
  const payerUserId = Number(session.user.id);
  const parsed = settleSplitSchema.safeParse({
    ...formData,
    date: formData.date ?? undefined,
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  const userRepo = getUserRepository();
  const otherUsers = await userRepo.findAllExcept(payerUserId);
  const recipient = otherUsers.find((u) => u.id === parsed.data.recipientUserId);
  if (!recipient) {
    return { success: false, error: "Invalid recipient." };
  }

  const splitService = new SplitService();
  const balance = await splitService.getBalance(payerUserId, parsed.data.groupId);
  const perUser = balance.perUser.find((u) => u.userId === parsed.data.recipientUserId);
  const iOweToRecipient = perUser?.iOwe ?? 0;
  if (parsed.data.amountCents > iOweToRecipient) {
    return {
      success: false,
      error: `You only owe ${formatRand(iOweToRecipient)}. Enter at most that amount to settle.`,
    };
  }
  const amountCents = parsed.data.amountCents;
  if (amountCents <= 0) {
    return { success: false, error: "You do not owe this person anything to settle in this group." };
  }

  const payer = await userRepo.findById(payerUserId);
  if (!payer) {
    return { success: false, error: "User not found." };
  }

  const date = parsed.data.date ?? new Date().toISOString().slice(0, 10);

  try {
    await splitService.settle(
      payerUserId,
      parsed.data.recipientUserId,
      amountCents,
      date,
      payer.name,
      recipient.name,
      parsed.data.groupId
    );
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to record settlement.",
    };
  }

  revalidatePath("/splits");
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/income");
  revalidatePath("/budget");
  return { success: true };
}

export async function updateSettlement(formData: {
  settlementId: number;
  amountCents: number;
  date: string;
}): Promise<SettleSplitResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  setRequestContextFromSession(session);
  const payerUserId = Number(session.user.id);
  const parsed = updateSettlementSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  const splitService = new SplitService();
  const settlementRow = await getSplitSettlementRepository().findById(parsed.data.settlementId);
  if (!settlementRow) {
    return { success: false, error: "Settlement not found." };
  }
  if (settlementRow.payerUserId !== payerUserId) {
    return { success: false, error: "Only the payer can edit this settlement." };
  }

  const userRepo = getUserRepository();
  const recipient = await userRepo.findById(settlementRow.recipientUserId);
  if (!recipient) {
    return { success: false, error: "Recipient not found." };
  }

  try {
    await splitService.updateSettlement(
      parsed.data.settlementId,
      payerUserId,
      parsed.data.amountCents,
      parsed.data.date,
      recipient.name
    );
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update settlement.",
    };
  }

  revalidatePath("/splits");
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/income");
  revalidatePath("/budget");
  return { success: true };
}

export async function deleteSettlement(settlementId: number): Promise<SettleSplitResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  setRequestContextFromSession(session);
  const payerUserId = Number(session.user.id);
  const parsed = deleteSettlementSchema.safeParse({ settlementId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  const splitService = new SplitService();
  try {
    await splitService.deleteSettlement(parsed.data.settlementId, payerUserId);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete settlement.",
    };
  }

  revalidatePath("/splits");
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/income");
  revalidatePath("/budget");
  return { success: true };
}
