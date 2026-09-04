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

  // createSplit removed. Creating a shared expense is
  // ExpenseService.create(userId, { ..., participants }) -- one path for solo
  // and shared spends, and it works for any number of people. This file keeps
  // balances, settlement and history.

  /**
   * Split allocations since the day after the last settlement between these two users
   * (all history if they have never settled). Both directions are returned so the
   * statement can net "what they owe me" against "what I owe them".
   */
  async getStatementSinceLastSettlement(
    viewerUserId: number,
    otherUserId: number,
    asOfDate: string,
    groupId?: number
  ): Promise<{
    owedItems: OwedLineItemRow[];
    owingItems: OwedLineItemRow[];
    owedTotal: number;
    owingTotal: number;
    lastSettlementDate: string | null;
  }> {
    const last = await this.settlementRepo.findLatestBetween(
      viewerUserId,
      otherUserId,
      groupId
    );
    const start = last
      ? format(addDays(parseISO(last.date), 1), "yyyy-MM-dd")
      : "1970-01-01";
    const [owedItems, owingItems] = await Promise.all([
      this.allocationRepo.findOwedToPayerInPeriod(
        viewerUserId,
        otherUserId,
        start,
        asOfDate,
        groupId
      ),
      this.allocationRepo.findOwedToPayerInPeriod(
        otherUserId,
        viewerUserId,
        start,
        asOfDate,
        groupId
      ),
    ]);
    const owedTotal = owedItems.reduce((sum, item) => sum + item.amount, 0);
    const owingTotal = owingItems.reduce((sum, item) => sum + item.amount, 0);
    return {
      owedItems,
      owingItems,
      owedTotal,
      owingTotal,
      lastSettlementDate: last?.date ?? null,
    };
  }

  async getBalance(currentUserId: number, groupId?: number): Promise<SplitBalance> {
    const allocations = await this.allocationRepo.findAllForBalance(groupId);
    const settlements = await this.settlementRepo.findAllForUser(currentUserId, groupId);
    return calculateSplitBalance({ currentUserId, allocations, settlements });
  }

  /** One row per other household member, netted, for the Splits screen. */
  async getBalances(currentUserId: number, groupId?: number): Promise<Array<{
    userId: number;
    userName: string;
    owedToMe: number;
    iOwe: number;
    net: number;
    itemCount: number;
    lastSettledDate: string | null;
  }>> {
    const balance = await this.getBalance(currentUserId, groupId);
    const members = await this.userRepo.findAllExcept(currentUserId);
    const asOf = new Date().toISOString().slice(0, 10);
    return Promise.all(
      members.map(async (m) => {
        const row = balance.perUser.find((u) => u.userId === m.id);
        const last = await this.settlementRepo.findLatestBetween(currentUserId, m.id, groupId);
        const statement = await this.getStatementSinceLastSettlement(
          currentUserId, m.id, asOf, groupId
        );
        return {
          userId: m.id,
          userName: m.name,
          owedToMe: row?.owedToMe ?? 0,
          iOwe: row?.iOwe ?? 0,
          net: (row?.owedToMe ?? 0) - (row?.iOwe ?? 0),
          itemCount: statement.owedItems.length + statement.owingItems.length,
          lastSettledDate: last?.date ?? null,
        };
      })
    );
  }

  async settle(
    payerUserId: number,
    recipientUserId: number,
    amountCents: number,
    date: string,
    payerUserName: string,
    recipientUserName: string,
    groupId: number,
    /** Category the recipient's money lands in. Defaults to their most overspent. */
    targetCategoryId?: number
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
      // The repayment reduces the recipient's spend in the chosen category
      // rather than arriving as unassigned income, so it clears the overspend
      // it repairs. A negative expense is the honest representation: their
      // category spend genuinely goes down.
      if (targetCategoryId != null) {
        await this.expenseRepo.create({
          userId: recipientUserId,
          categoryId: targetCategoryId,
          amount: -amountCents,
          note: `Repaid by ${payerUserName}`,
          date,
          month: incomeMonth,
        });
      }
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
    recipientUserName: string,
    recipientUserId: number
  ): Promise<void> {
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
