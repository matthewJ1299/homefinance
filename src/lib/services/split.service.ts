import {
  getExpenseRepository,
  getSplitAllocationRepository,
  getSplitSettlementRepository,
  getUserRepository,
  getCategoryRepository,
  getIncomeRepository,
} from "@/lib/repositories";
import { monthFromDate } from "@/lib/utils/date";
import type { SplitBalance, SplitHistoryItem } from "@/lib/types";

export type CreateSplitOptions =
  | { type: "equal" }
  | { type: "full" }
  | { type: "exact"; myShareCents: number; otherShareCents: number };

export class SplitService {
  constructor(
    private expenseRepo = getExpenseRepository(),
    private allocationRepo = getSplitAllocationRepository(),
    private settlementRepo = getSplitSettlementRepository(),
    private userRepo = getUserRepository(),
    private categoryRepo = getCategoryRepository(),
    private incomeRepo = getIncomeRepository()
  ) {}

  async createSplit(
    paidByUserId: number,
    totalAmountCents: number,
    categoryId: number,
    note: string | null,
    date: string,
    options: CreateSplitOptions
  ): Promise<{ id: number }> {
    const otherUsers = await this.userRepo.findAllExcept(paidByUserId);
    if (otherUsers.length === 0) {
      throw new Error("No other user to split with.");
    }
    const otherUser = otherUsers[0];
    let amountOwed: number;
    switch (options.type) {
      case "equal":
        amountOwed = Math.floor(totalAmountCents / 2);
        break;
      case "full":
        amountOwed = totalAmountCents;
        break;
      case "exact":
        amountOwed = options.otherShareCents;
        break;
    }
    if (amountOwed <= 0) {
      return this.expenseRepo.create({
        userId: paidByUserId,
        categoryId,
        amount: totalAmountCents,
        note,
        date,
        month: monthFromDate(date),
      });
    }
    const splitGroupId = crypto.randomUUID();
    const month = monthFromDate(date);
    const { id: expenseId } = await this.expenseRepo.create({
      userId: paidByUserId,
      categoryId,
      amount: totalAmountCents,
      note,
      date,
      month,
      splitGroupId,
      paidByUserId,
    });
    try {
      await this.allocationRepo.create(expenseId, otherUser.id, amountOwed);
    } catch (e) {
      await this.expenseRepo.delete(expenseId);
      throw e;
    }
    return { id: expenseId };
  }

  async getBalance(currentUserId: number): Promise<SplitBalance> {
    const allocations = await this.allocationRepo.findAllForBalance();
    const settlements = await this.settlementRepo.findAllForUser(currentUserId);

    const perUserMap = new Map<
      number,
      { userId: number; userName: string; owedToMe: number; iOwe: number }
    >();
    for (const row of allocations) {
      if (row.paidByUserId === currentUserId && row.allocationUserId !== currentUserId) {
        const existing = perUserMap.get(row.allocationUserId) ?? {
          userId: row.allocationUserId,
          userName: row.allocationUserName,
          owedToMe: 0,
          iOwe: 0,
        };
        existing.owedToMe += row.amount;
        perUserMap.set(row.allocationUserId, existing);
      } else if (row.allocationUserId === currentUserId) {
        const existing = perUserMap.get(row.paidByUserId) ?? {
          userId: row.paidByUserId,
          userName: row.paidByUserName,
          owedToMe: 0,
          iOwe: 0,
        };
        existing.iOwe += row.amount;
        perUserMap.set(row.paidByUserId, existing);
      }
    }

    for (const s of settlements) {
      if (s.recipientUserId === currentUserId) {
        const existing = perUserMap.get(s.payerUserId) ?? {
          userId: s.payerUserId,
          userName: s.payerUserName,
          owedToMe: 0,
          iOwe: 0,
        };
        existing.owedToMe -= s.amount;
        perUserMap.set(s.payerUserId, existing);
      } else {
        const existing = perUserMap.get(s.recipientUserId) ?? {
          userId: s.recipientUserId,
          userName: s.recipientUserName,
          owedToMe: 0,
          iOwe: 0,
        };
        existing.iOwe -= s.amount;
        perUserMap.set(s.recipientUserId, existing);
      }
    }

    let owedToMe = 0;
    let iOwe = 0;
    for (const u of perUserMap.values()) {
      if (u.owedToMe > 0) owedToMe += u.owedToMe;
      if (u.iOwe > 0) iOwe += u.iOwe;
    }
    const perUser = Array.from(perUserMap.values());
    return {
      owedToMe,
      iOwe,
      net: owedToMe - iOwe,
      perUser,
    };
  }

  async settle(
    payerUserId: number,
    recipientUserId: number,
    amountCents: number,
    date: string,
    payerUserName: string,
    recipientUserName: string
  ): Promise<void> {
    const splitsCategory = await this.categoryRepo.findByName("Splits");
    if (!splitsCategory) {
      throw new Error("Splits category not found. Run db:seed to create it.");
    }
    const month = monthFromDate(date);

    const { id: expenseId } = await this.expenseRepo.create({
      userId: payerUserId,
      categoryId: splitsCategory.id,
      amount: amountCents,
      note: `Settlement to ${recipientUserName}`,
      date,
      month,
    });
    let incomeId: number | null = null;
    try {
      const income = await this.incomeRepo.create({
        userId: recipientUserId,
        amount: amountCents,
        type: "ad_hoc",
        description: `Settlement from ${payerUserName}`,
        date,
        month,
      });
      incomeId = income.id;
      await this.settlementRepo.create({
        payerUserId,
        recipientUserId,
        amount: amountCents,
        date,
        expenseId,
        incomeId,
      });
    } catch (e) {
      await this.expenseRepo.delete(expenseId);
      if (incomeId != null) await this.incomeRepo.delete(incomeId);
      throw e;
    }
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
    const month = monthFromDate(date);

    let incomeId: number | null = null;
    try {
      const income = await this.incomeRepo.create({
        userId: recipientUserId,
        amount: amountCents,
        type: "ad_hoc",
        description: `Settlement from ${payerUserName}`,
        date,
        month,
      });
      incomeId = income.id;
      await this.settlementRepo.create({
        payerUserId,
        recipientUserId,
        amount: amountCents,
        date,
        expenseId,
        incomeId,
      });
    } catch (e) {
      if (incomeId != null) await this.incomeRepo.delete(incomeId);
      throw e;
    }
  }

  async getSplitHistory(userId: number): Promise<SplitHistoryItem[]> {
    const expenses = await this.expenseRepo.findSplitExpenses();
    const settlements = await this.settlementRepo.findAllForUser(userId);

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
