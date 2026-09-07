"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { BudgetService } from "@/lib/services/budget.service";
import { allocateSchema, transferSchema } from "@/lib/validators/budget.schema";
import { isValidMonth } from "@/lib/utils/date";

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
  setRequestContextFromSession(session);
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
  setRequestContextFromSession(session);
  const parsed = allocateSchema.pick({ month: true }).safeParse({ month });
  if (!parsed.success) return { success: false, error: parsed.error.message };
  const service = new BudgetService();
  const result = await service.autoAllocate(parsed.data.month, Number(session.user.id));
  if (result.success) {
    revalidatePath("/budget");
    revalidatePath("/welcome");
    revalidatePath("/dashboard");
  }
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
  setRequestContextFromSession(session);
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

/**
 * Opens `month`: writes carry-in from the prior month's availables and records
 * the uncovered overspend. Idempotent, so Skip on /new-month calls it too --
 * the defaults apply whether or not anyone reads the screen.
 */
export async function openBudgetMonth(month: string): Promise<
  { success: true; opened: boolean; carriedOverspend: number } | { success: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContextFromSession(session);
  if (!isValidMonth(month)) return { success: false, error: "Invalid month" };
  const service = new BudgetService();
  // The month named by the screen, plus any month behind it that was never
  // opened -- oldest first, or the carry chain reads a zero.
  await service.openMonthBacklog(Number(session.user.id), month);
  // `openMonth` is idempotent, so this is a no-op when the backlog already
  // covered `month`; it stays for the case where it did not.
  const result = await service.openMonth(month, Number(session.user.id));
  revalidatePath("/budget");
  revalidatePath("/dashboard");
  return { success: true, ...result };
}

/** Moves money between categories to clear an overspend before the month closes. */
export async function coverOverspend(data: {
  fromCategoryId: number;
  toCategoryId: number;
  month: string;
  amount: number;
}): Promise<BudgetActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContextFromSession(session);
  const parsed = transferSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };
  const result = await new BudgetService().coverOverspend({
    ...parsed.data,
    userId: Number(session.user.id),
  });
  if (!result.success) return { success: false, error: result.error };
  revalidatePath("/budget");
  revalidatePath("/dashboard");
  return { success: true };
}
