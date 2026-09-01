import { addDays, format, parseISO } from "date-fns";
import {
  getExpenseRepository,
  getSplitAllocationRepository,
  getSplitSettlementRepository,
  getSplitGroupRepository,
  getUserRepository,
  getCategoryRepository,
  getIncomeRepository,
  getAccountTransactionRepository,
} from "@/lib/repositories";
import type { OwedLineItemRow } from "@/lib/repositories/interfaces/split-allocation.repository";
import { budgetMonthKeyForUser } from "@/lib/utils/budget-month-for-user";
import type { SplitBalance, SplitHistoryItem } from "@/lib/types";
import { calculateSplitBalance, splitExpense } from "@/lib/services/finance/accounts";
import { withTransaction } from "@/lib/db/postgres-client";

export type CreateSplitOptions =
  | { type: "equal" }
  | { type: "full" }
  | { type: "exact"; myShareCents: number; otherShareCents: number };

export class SplitService {
  constructor(
    private expenseRepo = getExpenseRepository(),
    private allocationRepo = getSplitAllocationRepository(),
    private settlementRepo = getSplitSettlementRepository(),
    private splitGroupRepo = getSplitGroupRepository(),
    private userRepo = getUserRepository(),
    private categoryRepo = getCategoryRepository(),
    private incomeRepo = getIncomeRepository(),
    private accountTxRepo = getAccountTransactionRepository()
  ) {}

  async createSplit(
    paidByUserId: number,
    totalAmountCents: number,
    categoryId: number,
    note: string | null,
    date: string,
    options: CreateSplitOptions,
    groupId?: number,
    accountId?: number
  ): Promise<{ id: number }> {
    const otherUsers = await this.userRepo.findAllExcept(paidByUserId);
    if (otherUsers.length === 0) {
      throw new Error("No other user to split with.");
    }
    const otherUser = otherUsers[0];
    const resolvedGroupId =
      groupId ?? (await this.splitGroupRepo.findDefault())?.id ?? null;
    let amountOwed: number;
    switch (options.type) {
      case "equal": {
        const shares = splitExpense({
          amount: totalAmountCents,
          users: ["payer", "other"],
        });
        amountOwed = shares.other ?? Math.floor(totalAmountCents / 2);
        break;
      }
      case "full":
        amountOwed = totalAmountCents;
        break;
      case "exact":
        amountOwed = options.otherShareCents;
        break;
      default: {
        const _exhaustive: never = options;
        throw new Error(`Unhandled split type: ${String(_exhaustive)}`);
      }
    }
    if (amountOwed <= 0) {
      const month = await budgetMonthKeyForUser(paidByUserId, date);
      const { id } = await this.expenseRepo.create({
        userId: paidByUserId,
        categoryId,
        amount: totalAmountCents,
        note,
        date,
        month,
        accountId: accountId ?? null,
      });
      if (accountId != null) {
        await this.accountTxRepo.create({
          accountId,
          amount: -totalAmountCents,
          transactionType: "expense",
          referenceType: "expense",
          referenceId: id,
        });
      }
      return { id };
    }
    const splitGroupId = crypto.randomUUID();
    const month = await budgetMonthKeyForUser(paidByUserId, date);
    const { id: expenseId } = await this.expenseRepo.create({
      userId: paidByUserId,
      categoryId,
      amount: totalAmountCents,
      note,
      date,
      month,
      splitGroupId,
      paidByUserId,
      splitExpenseGroupId: resolvedGroupId,
      accountId: accountId ?? null,
    });
    if (accountId != null) {
      await this.accountTxRepo.create({
        accountId,
        amount: -totalAmountCents,
        transactionType: "expense",
        referenceType: "expense",
        referenceId: expenseId,
      });
    }
    try {
      await this.allocationRepo.create(expenseId, otherUser.id, amountOwed);
    } catch (e) {
      await this.expenseRepo.delete(expenseId);
      throw e;
    }
    return { id: expenseId };
  }

  /**
   * Split line items since the day after the last settlement between these two users
   * (all history if they have never settled). Direction is who paid vs who was allocated.
   * Settlements themselves are the cutoff, so they are not subtracted again.
   */
  async getStatementSinceLastSettlement(
    viewerUserId: number,
    otherUserId: number,
    direction: "owed" | "owing",
    asOfDate: string,
    groupId?: number
  ): Promise<{
    lineItems: OwedLineItemRow[];
    splitTotal: number;
    lastSettlementDate: string | null;
  }> {
    let payerUserId: number;
    let debtorUserId: number;
    switch (direction) {
      case "owed":
        payerUserId = viewerUserId;
        debtorUserId = otherUserId;
        break;
      case "owing":
        payerUserId = otherUserId;
        debtorUserId = viewerUserId;
        break;
      default: {
        const _exhaustive: never = direction;
        throw new Error(`Unhandled statement direction: ${String(_exhaustive)}`);
      }
    }

    const last = await this.settlementRepo.findLatestBetween(
      viewerUserId,
      otherUserId,
      groupId
    );
    const start = last
      ? format(addDays(parseISO(last.date), 1), "yyyy-MM-dd")
      : "1970-01-01";
    const lineItems = await this.allocationRepo.findOwedToPayerInPeriod(
      payerUserId,
      debtorUserId,
      start,
      asOfDate,
      groupId
    );
    const splitTotal = lineItems.reduce((sum, i) => sum + i.amount, 0);
    return {
      lineItems,
      splitTotal,
      lastSettlementDate: last?.date ?? null,
    };
  }

  async getBalance(currentUserId: number, groupId?: number): Promise<SplitBalance> {
    const allocations = await this.allocationRepo.findAllForBalance(groupId);
    const settlements = await this.settlementRepo.findAllForUser(currentUserId, groupId);
    return calculateSplitBalance({ currentUserId, allocations, settlements });
  }

  async settle(
    payerUserId: number,
    recipientUserId: number,
    amountCents: number,
    date: string,
    payerUserName: string,
    recipientUserName: string,
    groupId: number
  ): Promise<void> {
    const splitsCategory = await this.categoryRepo.findByName("Splits");
    if (!splitsCategory) {
      throw new Error("Splits category not found. Run db:seed to create it.");
    }
    const expenseMonth = await budgetMonthKeyForUser(payerUserId, date);
    const incomeMonth = await budgetMonthKeyForUser(recipientUserId, date);

    const { id: expenseId } = await this.expenseRepo.create({
      userId: payerUserId,
      categoryId: splitsCategory.id,
      amount: amountCents,
      note: `Settlement to ${recipientUserName}`,
      date,
      month: expenseMonth,
    });
    let incomeId: number | null = null;
    try {
      const income = await this.incomeRepo.create({
        userId: recipientUserId,
        amount: amountCents,
        type: "ad_hoc",
        description: `Settlement from ${payerUserName}`,
        date,
        month: incomeMonth,
      });
      incomeId = income.id;
      await this.settlementRepo.create({
        payerUserId,
        recipientUserId,
        amount: amountCents,
        date,
        expenseId,
        incomeId,
        splitExpenseGroupId: groupId,
      });
    } catch (e) {
      await this.expenseRepo.delete(expenseId);
      if (incomeId != null) await this.incomeRepo.delete(incomeId);
      throw e;
    }
  }

  async updateSettlement(
    settlementId: number,
    payerUserId: number,
    amountCents: number,
    date: string,
    recipientUserName: string
  ): Promise<void> {
    const settlement = await this.settlementRepo.findById(settlementId);
    if (!settlement) {
      throw new Error("Settlement not found.");
    }
    if (settlement.payerUserId !== payerUserId) {
      throw new Error("Only the payer can edit this settlement.");
    }
    if (amountCents <= 0) {
      throw new Error("Amount must be greater than zero.");
    }

    const expenseMonth = await budgetMonthKeyForUser(payerUserId, date);
    const incomeMonth = await budgetMonthKeyForUser(settlement.recipientUserId, date);

    await withTransaction(async () => {
      await this.settlementRepo.update(settlementId, { amount: amountCents, date });
      if (settlement.expenseId != null) {
        await this.expenseRepo.update(settlement.expenseId, {
          amount: amountCents,
          date,
          month: expenseMonth,
          note: `Settlement to ${recipientUserName}`,
        });
      }
      if (settlement.incomeId != null) {
        const payer = await this.userRepo.findById(payerUserId);
        await this.incomeRepo.update(settlement.incomeId, {
          amount: amountCents,
          date,
          month: incomeMonth,
          description: `Settlement from ${payer?.name ?? "Someone"}`,
        });
      }
    });
  }

  async deleteSettlement(settlementId: number, payerUserId: number): Promise<void> {
    const settlement = await this.settlementRepo.findById(settlementId);
    if (!settlement) {
      throw new Error("Settlement not found.");
    }
    if (settlement.payerUserId !== payerUserId) {
      throw new Error("Only the payer can delete this settlement.");
    }

    await withTransaction(async () => {
      if (settlement.incomeId != null) {
        await this.incomeRepo.delete(settlement.incomeId);
      }
      await this.settlementRepo.delete(settlementId);
      if (settlement.expenseId != null) {
        await this.expenseRepo.delete(settlement.expenseId);
      }
    });
  }

  /**
   * Records a settlement for an expense already created (e.g. from dashboard with category Splits).
   * Creates income for the recipient and a settlement record so the splits page shows it and reduces "I owe".
   */
  async recordSettlementForExpense(
    expenseId: number,
    payerUserId: number,
    amountCents: number,
    date: string,
    payerUserName: string,
    recipientUserName: string
  ): Promise<void> {
    const otherUsers = await this.userRepo.findAllExcept(payerUserId);
    if (otherUsers.length === 0) {
      throw new Error("No other user to settle with.");
    }
    const recipientUserId = otherUsers[0].id;
    const incomeMonth = await budgetMonthKeyForUser(recipientUserId, date);

    let incomeId: number | null = null;
    try {
      const income = await this.incomeRepo.create({
        userId: recipientUserId,
        amount: amountCents,
        type: "ad_hoc",
        description: `Settlement from ${payerUserName}`,
        date,
        month: incomeMonth,
      });
      incomeId = income.id;
      const defaultGroup = await this.splitGroupRepo.findDefault();
      await this.settlementRepo.create({
        payerUserId,
        recipientUserId,
        amount: amountCents,
        date,
        expenseId,
        incomeId,
        splitExpenseGroupId: defaultGroup?.id ?? null,
      });
    } catch (e) {
      if (incomeId != null) await this.incomeRepo.delete(incomeId);
      throw e;
    }
  }

  async getSplitHistory(userId: number, groupId?: number): Promise<SplitHistoryItem[]> {
    const expenses = await this.expenseRepo.findSplitExpenses(groupId);
    const settlements = await this.settlementRepo.findAllForUser(userId, groupId);

    const result: SplitHistoryItem[] = [];
    for (const exp of expenses) {
      const allocations = await this.allocationRepo.findByExpenseId(exp.id);
      result.push({
        type: "expense",
        expenseId: exp.id,
        paidByUserId: exp.userId,
        paidByUserName: exp.userName,
        totalAmount: exp.amount,
        categoryId: exp.categoryId,
        categoryName: exp.categoryName,
        date: exp.date,
        note: exp.note,
        allocations: allocations.map((a) => ({ userId: a.userId, userName: a.userName, amount: a.amount })),
      });
    }
    for (const s of settlements) {
      result.push({
        type: "settlement",
        settlementId: s.id,
        expenseId: s.expenseId ?? null,
        incomeId: s.incomeId ?? null,
        payerUserId: s.payerUserId,
        payerUserName: s.payerUserName,
        recipientUserId: s.recipientUserId,
        recipientUserName: s.recipientUserName,
        amount: s.amount,
        date: s.date,
      });
    }
    return result.sort((a, b) => b.date.localeCompare(a.date));
  }
}
