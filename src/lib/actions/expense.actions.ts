"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { ExpenseService } from "@/lib/services/expense.service";
import { BudgetService } from "@/lib/services/budget.service";
import { SplitService } from "@/lib/services/split.service";
import { MortgageService } from "@/lib/services/mortgage.service";
import { budgetMonthKeyForUser } from "@/lib/utils/budget-month-for-user";
import {
  getExpenseRepository,
  getCategoryRepository,
  getUserRepository,
  getSplitSettlementRepository,
  getSplitAllocationRepository,
  getIncomeRepository,
} from "@/lib/repositories";
import type { ExpenseWithDetails } from "@/lib/types";
import { createExpenseSchema, updateExpenseSchema } from "@/lib/validators/expense.schema";
import { createSplitExpenseSchema } from "@/lib/validators/split.schema";
import { formatRand } from "@/lib/utils/currency";

export type ExpenseActionResult =
  | { success: true; id?: number; warning?: string; budgetRemaining?: number; categoryName?: string; isOverspent?: boolean }
  | { success: false; error: string };

export async function addExpense(formData: {
  categoryId: number;
  amount: number;
  note?: string | null;
  date: string;
  accountId?: number;
}): Promise<ExpenseActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  setRequestContextFromSession(session);
  const userId = Number(session.user.id);
  const parsed = createExpenseSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  const userRepo = getUserRepository();
  const userRow = await userRepo.findById(userId);
  if (!userRow) {
    return { success: false, error: "Session expired. Please sign in again." };
  }
  const categoryRepo = getCategoryRepository();
  const category = await categoryRepo.findById(parsed.data.categoryId);
  if (!category) {
    return { success: false, error: "Invalid category. Please refresh the page." };
  }

  const isSplitsSettlement = category.name === "Splits";
  if (isSplitsSettlement) {
    const splitService = new SplitService();
    const balance = await splitService.getBalance(userId);
    const otherUsers = await userRepo.findAllExcept(userId);
    if (otherUsers.length === 0) {
      return { success: false, error: "No other user to settle with." };
    }
    const recipient = otherUsers[0];
    const perUser = balance.perUser.find((u) => u.userId === recipient.id);
    const iOwe = perUser?.iOwe ?? 0;
    if (iOwe <= 0) {
      return { success: false, error: "You do not owe anything to settle." };
    }
    if (parsed.data.amount > iOwe) {
      return {
        success: false,
        error: `You only owe ${formatRand(iOwe)}. Enter at most that amount to settle.`,
      };
    }
    const service = new ExpenseService();
    const { id } = await service.create(userId, parsed.data);
    const payer = await userRepo.findById(userId);
    if (!payer) {
      await service.delete(id);
      return { success: false, error: "User not found." };
    }
    try {
      await splitService.recordSettlementForExpense(
        id,
        userId,
        parsed.data.amount,
        parsed.data.date,
        payer.name,
        recipient.name
      );
    } catch (err) {
      await service.delete(id);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to record settlement.",
      };
    }
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    revalidatePath("/splits");
    revalidatePath("/income");
    revalidatePath("/budget");
    return { success: true, id };
  }

  const service = new ExpenseService();
  const { id } = await service.create(userId, parsed.data);

  let warning: string | undefined;
  if (category.name.toLowerCase().trim() === "mortgage") {
    const mortgageService = new MortgageService();
    const recorded = await mortgageService.recordPaymentFromExpense(
      userId,
      parsed.data.amount,
      parsed.data.date,
      parsed.data.note ?? null
    );
    revalidatePath("/mortgage");
    if (!recorded) {
      warning =
        "Expense saved. Mortgage is not set up yet, so this payment was not recorded on the Mortgage page. Set up your mortgage first, then add the expense again to record it.";
    }
  }

  const month = await budgetMonthKeyForUser(userId, parsed.data.date);
  let budgetRemaining: number | undefined;
  let categoryName: string | undefined;
  let isOverspent: boolean | undefined;
  try {
    const budgetService = new BudgetService();
    const overview = await budgetService.getOverview(month, userId);
    const row = overview.categories.find((c) => c.categoryId === parsed.data.categoryId);
    if (row) {
      budgetRemaining = row.remaining;
      categoryName = row.categoryName;
      isOverspent = row.isOverspent;
    }
  } catch {
    // Budget fetch failure must not affect the primary operation
  }

  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/budget");
  return { success: true, id, warning, budgetRemaining, categoryName, isOverspent };
}

export type GetExpenseForEditResult =
  | { success: true; expense: ExpenseWithDetails; allocations?: Array<{ userId: number; userName: string; amount: number }> }
  | { success: false; error: string };

export async function getExpenseForEdit(expenseId: number): Promise<GetExpenseForEditResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  setRequestContextFromSession(session);
  const expenseRepo = getExpenseRepository();
  const expense = await expenseRepo.findById(expenseId);
  if (!expense) {
    return { success: false, error: "Expense not found." };
  }
  if (expense.userId !== Number(session.user.id)) {
    return { success: false, error: "You can only edit your own expenses." };
  }
  if (!expense.splitGroupId) {
    return { success: true, expense };
  }
  const allocationRepo = getSplitAllocationRepository();
  const allocations = await allocationRepo.findByExpenseId(expenseId);
  return {
    success: true,
    expense,
    allocations: allocations.map((a) => ({ userId: a.userId, userName: a.userName, amount: a.amount })),
  };
}

export async function updateExpense(
  id: number,
  formData: {
    categoryId?: number;
    amount?: number;
    note?: string | null;
    date?: string;
    splitType?: "equal" | "full" | "exact";
    myShareCents?: number;
    otherShareCents?: number;
    accountId?: number;
  }
): Promise<ExpenseActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  setRequestContextFromSession(session);
  const parsed = updateExpenseSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  const expenseRepo = getExpenseRepository();
  const expense = await expenseRepo.findById(id);
  if (!expense) {
    return { success: false, error: "Expense not found." };
  }
  if (expense.userId !== Number(session.user.id)) {
    return { success: false, error: "You can only edit your own expenses." };
  }

  const updatePayload: { categoryId?: number; amount?: number; note?: string | null; date?: string; month?: string } = {};
  if (parsed.data.categoryId != null) updatePayload.categoryId = parsed.data.categoryId;
  if (parsed.data.amount != null) updatePayload.amount = parsed.data.amount;
  if (parsed.data.note !== undefined) updatePayload.note = parsed.data.note;
  if (parsed.data.date != null) updatePayload.date = parsed.data.date;

  const service = new ExpenseService();
  await service.update(id, Number(session.user.id), updatePayload);

  const isSplit = Boolean(expense.splitGroupId);
  const shouldUpdateAllocations =
    isSplit && (parsed.data.splitType != null || parsed.data.amount != null);
  if (shouldUpdateAllocations) {
    const allocationRepo = getSplitAllocationRepository();
    const userRepo = getUserRepository();
    const otherUsers = await userRepo.findAllExcept(expense.userId);
    const otherUser = otherUsers[0];
    if (!otherUser) {
      revalidatePath("/dashboard");
      revalidatePath("/expenses");
      revalidatePath("/splits");
      return { success: true };
    }
    const totalCents = parsed.data.amount ?? expense.amount;
    let amountOwed: number;
    if (parsed.data.splitType != null) {
      switch (parsed.data.splitType) {
        case "equal":
          amountOwed = Math.floor(totalCents / 2);
          break;
        case "full":
          amountOwed = totalCents;
          break;
        case "exact":
          amountOwed = parsed.data.otherShareCents ?? 0;
          break;
        default:
          amountOwed = Math.floor(totalCents / 2);
      }
    } else {
      const currentAllocations = await allocationRepo.findByExpenseId(id);
      const currentOtherShare = currentAllocations.reduce((s, a) => s + a.amount, 0);
      amountOwed =
        expense.amount > 0
          ? Math.round((totalCents * currentOtherShare) / expense.amount)
          : Math.floor(totalCents / 2);
    }
    await allocationRepo.deleteByExpenseId(id);
    if (amountOwed > 0) {
      await allocationRepo.create(id, otherUser.id, amountOwed);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/splits");
  return { success: true };
}

export async function deleteExpense(id: number): Promise<ExpenseActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  setRequestContextFromSession(session);
  const expenseRepo = getExpenseRepository();
  const expense = await expenseRepo.findById(id);
  if (!expense) {
    return { success: false, error: "Expense not found." };
  }
  if (expense.splitGroupId) {
    await expenseRepo.deleteBySplitGroupId(expense.splitGroupId);
  } else {
    const settlementRepo = getSplitSettlementRepository();
    const settlement = await settlementRepo.findByExpenseId(id);
    if (settlement) {
      if (settlement.incomeId != null) {
        const incomeRepo = getIncomeRepository();
        await incomeRepo.delete(settlement.incomeId);
      }
      await settlementRepo.delete(settlement.id);
    }
    const service = new ExpenseService();
    await service.delete(id);
  }
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/splits");
  revalidatePath("/income");
  revalidatePath("/budget");
  return { success: true };
}

export async function addSplitExpense(formData: {
  categoryId: number;
  totalAmountCents: number;
  note?: string | null;
  date: string;
  splitType: "equal" | "full" | "exact";
  myShareCents?: number;
  otherShareCents?: number;
  groupId?: number | null;
  accountId?: number;
}): Promise<ExpenseActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  setRequestContextFromSession(session);
  const parsed = createSplitExpenseSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }
  const userId = Number(session.user.id);
  const userRepo = getUserRepository();
  const userRow = await userRepo.findById(userId);
  if (!userRow) {
    return { success: false, error: "Session expired. Please sign in again." };
  }
  const categoryRepo = getCategoryRepository();
  const categoryRow = await categoryRepo.findById(parsed.data.categoryId);
  if (!categoryRow) {
    return { success: false, error: "Invalid category. Please refresh the page." };
  }
  const splitService = new SplitService();
  try {
    const options =
      parsed.data.splitType === "exact"
        ? {
            type: "exact" as const,
            myShareCents: parsed.data.myShareCents!,
            otherShareCents: parsed.data.otherShareCents!,
          }
        : parsed.data.splitType === "full"
          ? { type: "full" as const }
          : { type: "equal" as const };
    const groupId =
      parsed.data.groupId != null && parsed.data.groupId > 0 ? parsed.data.groupId : undefined;
    const { id } = await splitService.createSplit(
      userId,
      parsed.data.totalAmountCents,
      parsed.data.categoryId,
      parsed.data.note ?? null,
      parsed.data.date,
      options,
      groupId,
      parsed.data.accountId
    );
    if (categoryRow.name.toLowerCase().trim() === "mortgage") {
      const mortgageService = new MortgageService();
      await mortgageService.recordPaymentFromExpense(
        userId,
        parsed.data.totalAmountCents,
        parsed.data.date,
        parsed.data.note ?? null
      );
      revalidatePath("/mortgage");
    }
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    revalidatePath("/splits");
    try {
      const { NotificationService, isNotificationConfigured } = await import(
        "@/lib/services/notification.service"
      );
      if (isNotificationConfigured()) {
        const notificationService = new NotificationService();
        const userName = session.user.name ?? "Someone";
        const amountRands = (parsed.data.totalAmountCents / 100).toFixed(2);
        const note = parsed.data.note?.trim() ? `: ${parsed.data.note}` : "";
        await notificationService.sendToAllExcept(userId, {
          title: "HomeFinance",
          body: `${userName} added a split expense${note} (R${amountRands})`,
          url: "/splits",
        });
      }
    } catch {
      // Notification failure must not affect the primary operation
    }
    return { success: true, id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create split expense.",
    };
  }
}
