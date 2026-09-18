"use server";

import { revalidatePath } from "next/cache";
import { authedAction } from "@/lib/actions/_shared/authed-action";
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
  return authedAction<BudgetActionResult>(async ({ userId }) => {
    const parsed = allocateSchema.safeParse({ categoryId, month, amount });
    if (!parsed.success) return { success: false, error: parsed.error.message };
    await new BudgetService().setAllocation(categoryId, month, amount, userId);
    revalidatePath("/budget");
    return { success: true };
  }, { onError: "That amount didn't save. Try again." });
}

export async function autoAllocateBudget(month: string): Promise<
  | { success: true; updated: number }
  | { success: false; error: string }
> {
  return authedAction<{ success: true; updated: number }>(async ({ userId }) => {
    const parsed = allocateSchema.pick({ month: true }).safeParse({ month });
    if (!parsed.success) return { success: false, error: parsed.error.message };
    const result = await new BudgetService().autoAllocate(parsed.data.month, userId);
    if (result.success) {
      revalidatePath("/budget");
      revalidatePath("/welcome");
      revalidatePath("/dashboard");
    }
    return result;
  }, { onError: "Auto-assign didn't finish. Nothing was changed." });
}

export async function transferBudgetFunds(data: {
  fromCategoryId: number;
  toCategoryId: number;
  month: string;
  amount: number;
  reason?: string | null;
}): Promise<BudgetActionResult> {
  return authedAction<BudgetActionResult>(async ({ userId }) => {
    const parsed = transferSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.message };
    const result = await new BudgetService().transfer({ ...parsed.data, userId });
    if (!result.success) return { success: false, error: result.error };
    revalidatePath("/budget");
    return { success: true };
  }, { onError: "That move didn't save. The money is where it was." });
}

/**
 * Opens `month`: writes carry-in from the prior month's availables and records
 * the uncovered overspend. Idempotent, so Skip on /new-month calls it too --
 * the defaults apply whether or not anyone reads the screen.
 */
export async function openBudgetMonth(month: string): Promise<
  { success: true; opened: boolean; carriedOverspend: number } | { success: false; error: string }
> {
  return authedAction<{ success: true; opened: boolean; carriedOverspend: number }>(
    async ({ userId }) => {
      if (!isValidMonth(month)) return { success: false, error: "Invalid month" };
      const service = new BudgetService();
      // The month named by the screen, plus any month behind it that was never
      // opened -- oldest first, or the carry chain reads a zero.
      await service.openMonthBacklog(userId, month);
      // `openMonth` is idempotent, so this is a no-op when the backlog already
      // covered `month`; it stays for the case where it did not.
      const result = await service.openMonth(month, userId);
      revalidatePath("/budget");
      revalidatePath("/dashboard");
      return { success: true, ...result };
    },
    { onError: "This month didn't open. Try again." }
  );
}

/** Moves money between categories to clear an overspend before the month closes. */
export async function coverOverspend(data: {
  fromCategoryId: number;
  toCategoryId: number;
  month: string;
  amount: number;
}): Promise<BudgetActionResult> {
  return authedAction<BudgetActionResult>(async ({ userId }) => {
    const parsed = transferSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.message };
    const result = await new BudgetService().coverOverspend({ ...parsed.data, userId });
    if (!result.success) return { success: false, error: result.error };
    revalidatePath("/budget");
    revalidatePath("/dashboard");
    return { success: true };
  }, { onError: "That cover didn't save. The overspend is unchanged." });
}

/**
 * Re-opens any months the user skipped and rebuilds the carry-over chain.
 * Non-destructive: `openMonthBacklog` only opens months that were never opened,
 * oldest first, so nothing already correct is disturbed.
 */
export async function repairBudgetMonths(): Promise<
  { success: true; openedCount: number } | { success: false; error: string }
> {
  return authedAction<{ success: true; openedCount: number }>(async ({ userId }) => {
    const result = await new BudgetService().openMonthBacklog(userId);
    for (const path of ["/budget", "/dashboard", "/welcome", "/goals"]) {
      revalidatePath(path);
    }
    return { success: true, openedCount: result.opened.length };
  }, { onError: "Repair didn't finish. Nothing was changed." });
}

/**
 * Clears the signed-in user's entire envelope budget -- all assignments,
 * carry-over and transfers, across every month. Expenses, income, accounts and
 * categories are left untouched. Destructive and not reversible from the UI.
 */
export async function resetBudget(): Promise<BudgetActionResult> {
  return authedAction<BudgetActionResult>(async ({ userId }) => {
    await new BudgetService().resetBudget(userId);
    for (const path of ["/budget", "/dashboard", "/welcome", "/goals"]) {
      revalidatePath(path);
    }
    return { success: true };
  }, { onError: "Your budget wasn't reset. Nothing was changed." });
}
