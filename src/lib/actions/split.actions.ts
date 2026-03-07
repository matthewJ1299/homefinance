"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { SplitService } from "@/lib/services/split.service";
import { getUserRepository } from "@/lib/repositories";
import { settleSplitSchema } from "@/lib/validators/split.schema";
import type { SplitBalance, SplitHistoryItem } from "@/lib/types";

export type SettleSplitResult = { success: true } | { success: false; error: string };

export async function getSplitBalance(): Promise<
  { success: true; balance: SplitBalance } | { success: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  const splitService = new SplitService();
  const balance = await splitService.getBalance(Number(session.user.id));
  return { success: true, balance };
}

export async function getSplitHistory(): Promise<
  { success: true; history: SplitHistoryItem[] } | { success: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  const splitService = new SplitService();
  const history = await splitService.getSplitHistory(Number(session.user.id));
  return { success: true, history };
}

export async function settleSplit(formData: {
  recipientUserId: number;
  amountCents: number;
  date?: string;
}): Promise<SettleSplitResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
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
  const balance = await splitService.getBalance(payerUserId);
  const perUser = balance.perUser.find((u) => u.userId === parsed.data.recipientUserId);
  const iOweToRecipient = perUser?.iOwe ?? 0;
  const amountCents = Math.min(parsed.data.amountCents, iOweToRecipient);
  if (amountCents <= 0) {
    return { success: false, error: "You do not owe this person anything to settle." };
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
      recipient.name
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
