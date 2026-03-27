"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { setRequestContext } from "@/lib/db/request-context";
import { getUserRepository } from "@/lib/repositories";
import { normalizeBudgetMonthStartDay } from "@/lib/utils/date";

export type UpdateBudgetMonthStartDayResult =
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
