"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { setRequestContext } from "@/lib/db/request-context";
import { BudgetService } from "@/lib/services/budget.service";
import { allocateSchema, transferSchema } from "@/lib/validators/budget.schema";

export type BudgetActionResult =
  | { success: true }
  | { success: false; error: string };

export async function setBudgetAllocation(
  categoryId: number,
  month: string,
  amount: number
): Promise<BudgetActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContext({ userId: session.user.id, userName: session.user.name ?? undefined });
  const parsed = allocateSchema.safeParse({ categoryId, month, amount });
  if (!parsed.success) return { success: false, error: parsed.error.message };
  const service = new BudgetService();
  await service.setAllocation(categoryId, month, amount, Number(session.user.id));
  revalidatePath("/budget");
  return { success: true };
}

export async function autoAllocateBudget(month: string): Promise<
  | { success: true; updated: number }
  | { success: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContext({ userId: session.user.id, userName: session.user.name ?? undefined });
  const parsed = allocateSchema.pick({ month: true }).safeParse({ month });
  if (!parsed.success) return { success: false, error: parsed.error.message };
  const service = new BudgetService();
  const result = await service.autoAllocate(parsed.data.month, Number(session.user.id));
  if (result.success) revalidatePath("/budget");
  return result;
}

export async function transferBudgetFunds(data: {
  fromCategoryId: number;
  toCategoryId: number;
  month: string;
  amount: number;
  reason?: string | null;
}): Promise<BudgetActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContext({ userId: session.user.id, userName: session.user.name ?? undefined });
  const parsed = transferSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };
  const service = new BudgetService();
  const result = await service.transfer({
    ...parsed.data,
    userId: Number(session.user.id),
  });
  if (!result.success) return { success: false, error: result.error };
  revalidatePath("/budget");
  return { success: true };
}
