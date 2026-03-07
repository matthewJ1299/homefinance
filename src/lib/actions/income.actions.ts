"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { initDb } from "@/lib/db";
import { IncomeService } from "@/lib/services/income.service";
import { createIncomeSchema, updateIncomeSchema } from "@/lib/validators/income.schema";
import type { IncomeType } from "@/lib/types";

export type IncomeActionResult = { success: true; id?: number } | { success: false; error: string };

export async function addIncome(formData: {
  amount: number;
  type: IncomeType;
  description?: string | null;
  date: string;
}): Promise<IncomeActionResult> {
  await initDb();
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  const parsed = createIncomeSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }
  const service = new IncomeService();
  const { id } = await service.create(Number(session.user.id), parsed.data);
  revalidatePath("/income");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
  revalidatePath("/summary");
  return { success: true, id };
}

export async function updateIncome(
  id: number,
  formData: { amount?: number; type?: IncomeType; description?: string | null; date?: string }
): Promise<IncomeActionResult> {
  await initDb();
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  const parsed = updateIncomeSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }
  const service = new IncomeService();
  await service.update(id, parsed.data);
  revalidatePath("/income");
  revalidatePath("/budget");
  return { success: true };
}

export async function deleteIncome(id: number): Promise<IncomeActionResult> {
  await initDb();
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  const service = new IncomeService();
  await service.delete(id);
  revalidatePath("/income");
  revalidatePath("/budget");
  return { success: true };
}
