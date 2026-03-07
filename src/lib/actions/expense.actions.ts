"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { initDb } from "@/lib/db";
import { ExpenseService } from "@/lib/services/expense.service";
import { SplitService } from "@/lib/services/split.service";
import { MortgageService } from "@/lib/services/mortgage.service";
import {
  getExpenseRepository,
  getCategoryRepository,
  getUserRepository,
  getSplitSettlementRepository,
  getIncomeRepository,
} from "@/lib/repositories";
import { createExpenseSchema, updateExpenseSchema } from "@/lib/validators/expense.schema";
import { createSplitExpenseSchema } from "@/lib/validators/split.schema";
import { formatRand } from "@/lib/utils/currency";

export type ExpenseActionResult =
  | { success: true; id?: number; warning?: string }
  | { success: false; error: string };

export async function addExpense(formData: {
  categoryId: number;
  amount: number;
  note?: string | null;
  date: string;
}): Promise<ExpenseActionResult> {
  await initDb();
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
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

  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  return { success: true, id, warning };
}

export async function updateExpense(
  id: number,
  formData: { categoryId?: number; amount?: number; note?: string | null; date?: string }
): Promise<ExpenseActionResult> {
  await initDb();
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
  await initDb();
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
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
}): Promise<ExpenseActionResult> {
  await initDb();
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
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
    const { id } = await splitService.createSplit(
      userId,
      parsed.data.totalAmountCents,
      parsed.data.categoryId,
      parsed.data.note ?? null,
      parsed.data.date,
      options
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
    return { success: true, id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create split expense.",
    };
  }
}
