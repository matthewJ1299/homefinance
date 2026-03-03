"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, categories } from "@/lib/db/schema";
import { ExpenseService } from "@/lib/services/expense.service";
import { createExpenseSchema, updateExpenseSchema } from "@/lib/validators/expense.schema";

export type ExpenseActionResult = { success: true; id?: number } | { success: false; error: string };

export async function addExpense(formData: {
  categoryId: number;
  amount: number;
  note?: string | null;
  date: string;
}): Promise<ExpenseActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  const userId = Number(session.user.id);
  const parsed = createExpenseSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  const [userRow] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!userRow) {
    return { success: false, error: "Session expired. Please sign in again." };
  }
  const [categoryRow] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, parsed.data.categoryId))
    .limit(1);
  if (!categoryRow) {
    return { success: false, error: "Invalid category. Please refresh the page." };
  }

  const service = new ExpenseService();
  const { id } = await service.create(userId, parsed.data);
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  return { success: true, id };
}

export async function updateExpense(
  id: number,
  formData: { categoryId?: number; amount?: number; note?: string | null; date?: string }
): Promise<ExpenseActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  const parsed = updateExpenseSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }
  const service = new ExpenseService();
  await service.update(id, Number(session.user.id), parsed.data);
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  return { success: true };
}

export async function deleteExpense(id: number): Promise<ExpenseActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  const service = new ExpenseService();
  await service.delete(id);
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  return { success: true };
}
