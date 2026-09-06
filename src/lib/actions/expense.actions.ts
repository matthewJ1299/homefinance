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
  getExpenseParticipantRepository,
  getIncomeRepository,
} from "@/lib/repositories";
import type { ExpenseWithDetails } from "@/lib/types";
import {
  createExpenseSchema,
  updateExpenseSchema,
  createExpenseWithParticipantsSchema,
} from "@/lib/validators/expense.schema";
import { createSplitExpenseSchema } from "@/lib/validators/split.schema";
import { splitExpenseWithRatios } from "@/lib/services/finance/accounts";
import { divideEqually, validateParticipantShares } from "@/lib/services/finance/participants";
import { formatRand } from "@/lib/utils/currency";

export type ExpenseActionResult =
  | {
      success: true;
      id?: number;
      warning?: string;
      /** What is left in the category after this spend. Negative when over. */
      budgetRemaining?: number;
      categoryName?: string;
      isOverspent?: boolean;
      /** The saver's own share, which is what hit their envelope. */
      myShare?: number;
    }
  | { success: false; error: string };

/**
 * The Add sheet's save path. One action for solo and shared spends: the caller
 * always sends participants, and a solo spend is simply a one-person list.
 * Returns what the spend did to the category so the toast can say it.
 */
export async function addExpenseWithParticipants(formData: {
  categoryId: number;
  amount: number;
  note?: string | null;
  date: string;
  accountId?: number;
  participants: { userId: number; shareMinor: number }[];
}): Promise<ExpenseActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContextFromSession(session);
  const userId = Number(session.user.id);

  const parsed = createExpenseWithParticipantsSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  const valid = validateParticipantShares(parsed.data.amount, parsed.data.participants, userId);
  if (!valid.ok) return { success: false, error: valid.error };

  const members = await getUserRepository().findAll();
  const memberIds = new Set(members.map((m) => m.id));
  if (parsed.data.participants.some((p) => !memberIds.has(p.userId))) {
    return { success: false, error: "Someone is not in this household." };
  }

  const service = new ExpenseService();
  const { id } = await service.create(userId, parsed.data);

  const myShare = parsed.data.participants.find((p) => p.userId === userId)!.shareMinor;
  const overview = await new BudgetService().getOverview(
    await budgetMonthKeyForUser(userId, parsed.data.date), userId
  );
  const row = overview.categories.find((c) => c.categoryId === parsed.data.categoryId);

  for (const path of ["/dashboard", "/expenses", "/budget", "/splits", "/what-i-owe"]) {
    revalidatePath(path);
  }

  return {
    success: true,
    id,
    myShare,
    budgetRemaining: row?.available,
    categoryName: row?.categoryName,
    isOverspent: (row?.available ?? 0) < 0,
  };
}

export async function addExpense(formData: {
  categoryId: number;
  amount: number;
  note?: string | null;
  date: string;
  accountId?: number;
  /** Who to settle with, when the category is Splits and more than one person is owed. */
  settleWithUserId?: number;
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
    // Who am I settling with? Explicit when given; otherwise the only person I
    // owe. Ambiguity is an error, not a guess: taking the first of the list
    // silently paid the wrong housemate in a household of three.
    const owed = balance.perUser.filter((u) => u.iOwe > 0);
    const recipientId = formData.settleWithUserId
      ?? (owed.length === 1 ? owed[0].userId : null);
    if (recipientId == null) {
      return owed.length === 0
        ? { success: false, error: "You do not owe anything to settle." }
        : { success: false, error: "Choose who you are settling with." };
    }
    const recipient = await userRepo.findById(recipientId);
    if (!recipient) return { success: false, error: "Person not found." };
    const iOwe = balance.perUser.find((u) => u.userId === recipientId)?.iOwe ?? 0;
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
        recipient.name,
        recipient.id
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

  const settlementRepo = getSplitSettlementRepository();
  const linkedSettlement = await settlementRepo.findByExpenseId(id);
  if (linkedSettlement) {
    return {
      success: false,
      error: "This is a split settlement. Edit it from the Splits page.",
    };
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
    const participantRepo = getExpenseParticipantRepository();
    const totalCents = parsed.data.amount ?? expense.amount;
    const payerId = expense.paidByUserId ?? expense.userId;

    // Who was in on it is recorded on the expense. Reading it back beats asking
    // the household who else exists -- that is what got the wrong housemate
    // charged when there were three.
    const existing = await participantRepo.findByExpenseId(id);
    let roster = existing.map((p) => p.userId);
    if (roster.length === 0) {
      // Pre-backfill row: reconstruct from the debt ledger.
      const allocations = await allocationRepo.findByExpenseId(id);
      roster = [payerId, ...allocations.map((a) => a.userId)];
    }
    const coParticipants = roster.filter((u) => u !== payerId);
    if (coParticipants.length === 0) {
      revalidatePath("/dashboard");
      revalidatePath("/expenses");
      revalidatePath("/splits");
      return { success: true };
    }

    let shares: Record<number, number>;
    if (parsed.data.participants?.length) {
      // An explicit list is the user's own arithmetic; honour it and let
      // validation below say so if it does not add up.
      roster = parsed.data.participants.map((p) => p.userId);
      shares = Object.fromEntries(
        parsed.data.participants.map((p) => [p.userId, p.shareMinor])
      );
    } else if (parsed.data.splitType === "full") {
      const theirs = divideEqually(totalCents, coParticipants);
      shares = { [payerId]: 0, ...theirs };
    } else if (parsed.data.splitType === "exact") {
      if (coParticipants.length !== 1) {
        return { success: false, error: "Set each person's share individually when more than two people are in on it." };
      }
      const otherShare = parsed.data.otherShareCents ?? 0;
      shares = { [payerId]: totalCents - otherShare, [coParticipants[0]]: otherShare };
    } else if (parsed.data.splitType === "equal") {
      shares = divideEqually(totalCents, roster);
    } else {
      // Amount changed with the split untouched: hold the existing proportions
      // and let the ratio helper place the remainder so the shares still sum.
      const weights: Record<string, number> = {};
      for (const u of roster) {
        weights[String(u)] =
          existing.find((p) => p.userId === u)?.shareMinor
          ?? (u === payerId ? Math.max(0, expense.amount) : 0);
      }
      const anyWeight = Object.values(weights).some((w) => w > 0);
      const scaled = anyWeight
        ? splitExpenseWithRatios({ amount: totalCents, splits: weights })
        : Object.fromEntries(Object.entries(divideEqually(totalCents, roster)).map(([k, v]) => [k, v]));
      shares = Object.fromEntries(Object.entries(scaled).map(([k, v]) => [Number(k), v]));
    }

    const participants = roster.map((u) => ({ userId: u, shareMinor: shares[u] ?? 0 }));
    const valid = validateParticipantShares(totalCents, participants, payerId);
    if (!valid.ok) return { success: false, error: valid.error };

    await participantRepo.replaceForExpense(id, participants);
    await allocationRepo.deleteByExpenseId(id);
    for (const p of participants) {
      if (p.userId === payerId || p.shareMinor <= 0) continue;
      await allocationRepo.create(id, p.userId, p.shareMinor);
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
  if (expense.userId !== Number(session.user.id)) {
    return { success: false, error: "You can only delete your own expenses." };
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
  try {
    const total = parsed.data.totalAmountCents;
    const others = (await userRepo.findAllExcept(userId)).map((u) => u.id);
    const picked = parsed.data.participantUserIds
      ?? [userId, ...others];   // no explicit pick means everyone
    const otherPicked = picked.filter((id) => id !== userId);
    if (otherPicked.length === 0) {
      return { success: false, error: "Pick at least one other person to share this with." };
    }

    let participants: { userId: number; shareMinor: number }[];
    if (parsed.data.splitType === "exact") {
      // `exact` is a two-person control: one "other share" box. Phase 4's nudge
      // control replaces it for larger households, so refuse rather than guess.
      if (otherPicked.length !== 1) {
        return { success: false, error: "Set each person's share individually when more than two people are in on it." };
      }
      participants = [
        { userId, shareMinor: parsed.data.myShareCents ?? total - (parsed.data.otherShareCents ?? 0) },
        { userId: otherPicked[0], shareMinor: parsed.data.otherShareCents ?? 0 },
      ];
    } else if (parsed.data.splitType === "full") {
      const theirs = divideEqually(total, otherPicked);
      participants = [
        { userId, shareMinor: 0 },
        ...otherPicked.map((id) => ({ userId: id, shareMinor: theirs[id] ?? 0 })),
      ];
    } else {
      const even = divideEqually(total, picked);
      participants = picked.map((id) => ({ userId: id, shareMinor: even[id] ?? 0 }));
    }

    const valid = validateParticipantShares(total, participants, userId);
    if (!valid.ok) return { success: false, error: valid.error };

    const groupId =
      parsed.data.groupId != null && parsed.data.groupId > 0 ? parsed.data.groupId : undefined;
    const { id } = await new ExpenseService().create(userId, {
      categoryId: parsed.data.categoryId,
      amount: total,
      note: parsed.data.note ?? null,
      date: parsed.data.date,
      accountId: parsed.data.accountId ?? null,
      splitExpenseGroupId: groupId ?? null,
      participants,
    });
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
          kind: "split",
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
