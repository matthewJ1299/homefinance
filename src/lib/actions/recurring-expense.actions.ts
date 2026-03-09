"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { setRequestContext } from "@/lib/db/request-context";
import { getRecurringExpenseRepository } from "@/lib/repositories";
import {
  createRecurringExpenseSchema,
  updateRecurringExpenseSchema,
} from "@/lib/validators/recurring-expense.schema";

export type RecurringExpenseActionResult =
  | { success: true; id?: number }
  | { success: false; error: string };

export async function createRecurringExpense(formData: {
  categoryId: number;
  amount: number;
  note?: string | null;
  dayOfMonth: number;
}): Promise<RecurringExpenseActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContext({ userId: session.user.id, userName: session.user.name ?? undefined });
  const parsed = createRecurringExpenseSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.message };
  const repo = getRecurringExpenseRepository();
  const userId = Number(session.user.id);
  try {
    const created = await repo.create({
      userId,
      categoryId: parsed.data.categoryId,
      amount: parsed.data.amount,
      note: parsed.data.note,
      dayOfMonth: parsed.data.dayOfMonth,
    });
    revalidatePath("/recurring-expenses");
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/budget");
    return { success: true, id: created.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to create" };
  }
}

export async function updateRecurringExpense(
  id: number,
  formData: {
    categoryId?: number;
    amount?: number;
    note?: string | null;
    dayOfMonth?: number;
  }
): Promise<RecurringExpenseActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContext({ userId: session.user.id, userName: session.user.name ?? undefined });
  const parsed = updateRecurringExpenseSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.message };
  const updates = parsed.data;
  if (Object.keys(updates).length === 0) return { success: true };
  const repo = getRecurringExpenseRepository();
  const existing = await repo.findById(id);
  if (!existing) return { success: false, error: "Not found" };
  if (existing.userId !== Number(session.user.id)) return { success: false, error: "Forbidden" };
  try {
    await repo.update(id, updates);
    revalidatePath("/recurring-expenses");
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/budget");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to update" };
  }
}

export async function deleteRecurringExpense(id: number): Promise<RecurringExpenseActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContext({ userId: session.user.id, userName: session.user.name ?? undefined });
  const repo = getRecurringExpenseRepository();
  const existing = await repo.findById(id);
  if (!existing) return { success: false, error: "Not found" };
  if (existing.userId !== Number(session.user.id)) return { success: false, error: "Forbidden" };
  try {
    await repo.delete(id);
    revalidatePath("/recurring-expenses");
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/budget");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to delete" };
  }
}
