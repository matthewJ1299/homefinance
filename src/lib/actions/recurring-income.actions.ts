"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { setRequestContext } from "@/lib/db/request-context";
import { getRecurringIncomeRepository } from "@/lib/repositories";
import {
  createRecurringIncomeSchema,
  updateRecurringIncomeSchema,
} from "@/lib/validators/recurring-income.schema";

export type RecurringIncomeActionResult =
  | { success: true; id?: number }
  | { success: false; error: string };

export async function createRecurringIncome(formData: {
  amount: number;
  type: "salary" | "ad_hoc";
  description?: string | null;
  dayOfMonth: number;
}): Promise<RecurringIncomeActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContext({ userId: session.user.id, userName: session.user.name ?? undefined });
  const parsed = createRecurringIncomeSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.message };
  const repo = getRecurringIncomeRepository();
  const userId = Number(session.user.id);
  try {
    const created = await repo.create({
      userId,
      amount: parsed.data.amount,
      type: parsed.data.type,
      description: parsed.data.description,
      dayOfMonth: parsed.data.dayOfMonth,
    });
    revalidatePath("/recurring-income");
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/budget");
    return { success: true, id: created.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to create" };
  }
}

export async function updateRecurringIncome(
  id: number,
  formData: {
    amount?: number;
    type?: "salary" | "ad_hoc";
    description?: string | null;
    dayOfMonth?: number;
  }
): Promise<RecurringIncomeActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContext({ userId: session.user.id, userName: session.user.name ?? undefined });
  const parsed = updateRecurringIncomeSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.message };
  const updates = parsed.data;
  if (Object.keys(updates).length === 0) return { success: true };
  const repo = getRecurringIncomeRepository();
  const existing = await repo.findById(id);
  if (!existing) return { success: false, error: "Not found" };
  if (existing.userId !== Number(session.user.id)) return { success: false, error: "Forbidden" };
  try {
    await repo.update(id, updates);
    revalidatePath("/recurring-income");
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/budget");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to update" };
  }
}

export async function deleteRecurringIncome(id: number): Promise<RecurringIncomeActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContext({ userId: session.user.id, userName: session.user.name ?? undefined });
  const repo = getRecurringIncomeRepository();
  const existing = await repo.findById(id);
  if (!existing) return { success: false, error: "Not found" };
  if (existing.userId !== Number(session.user.id)) return { success: false, error: "Forbidden" };
  try {
    await repo.delete(id);
    revalidatePath("/recurring-income");
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/budget");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to delete" };
  }
}
