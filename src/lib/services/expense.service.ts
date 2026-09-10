import { withTransaction } from "@/lib/db";
import {
  getExpenseRepository,
  getAccountTransactionRepository,
  getExpenseParticipantRepository,
  getSplitAllocationRepository,
  getSplitGroupRepository,
} from "@/lib/repositories";
import {
  validateParticipantShares,
  type ParticipantShare,
} from "@/lib/services/finance/participants";
import {
  budgetMonthKeyForUser,
  budgetMonthStartDayForUser,
  getBudgetPeriodForUserMonth,
} from "@/lib/utils/budget-month-for-user";
import type { ExpenseWithDetails } from "@/lib/types";
import type { CreateExpenseInput, UpdateExpenseInput } from "@/lib/repositories/interfaces/expense.repository";

export interface ExpensesByMonthResult {
  expenses: ExpenseWithDetails[];
  totals: {
    overall: number;
    byUser: Record<number, number>;
    byCategory: Record<number, number>;
  };
}

export class ExpenseService {
  constructor(
    private repo = getExpenseRepository(),
    private accountTxRepo = getAccountTransactionRepository(),
    private participantRepo = getExpenseParticipantRepository(),
    private allocationRepo = getSplitAllocationRepository(),
    private splitGroupRepo = getSplitGroupRepository()
  ) {}

  async getUsageCountsByCategory(userId?: number): Promise<Record<number, number>> {
    return this.repo.getUsageCountsByCategory(userId);
  }

  async getSpendingByCategoryForMonths(months: string[], userId?: number): Promise<Record<number, number>> {
    if (userId == null) {
      return this.repo.getSpendingByCategoryForMonths(months, undefined, undefined);
    }
    const startDay = await budgetMonthStartDayForUser(userId);
    return this.repo.getSpendingByCategoryForMonths(months, userId, startDay);
  }

  async getByMonthPaginated(
    month: string,
    page: number,
    pageSize: number,
    userId?: number,
    accountId?: number
  ): Promise<{
    expenses: ExpenseWithDetails[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const period = userId != null ? await getBudgetPeriodForUserMonth(month, userId) : undefined;
    const total = await this.repo.countByMonth(month, userId, accountId, period);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const offset = (safePage - 1) * pageSize;
    const expenses = await this.repo.findByMonthPaginated(
      month,
      pageSize,
      offset,
      userId,
      accountId,
      period
    );
    return {
      expenses,
      total,
      page: safePage,
      pageSize,
      totalPages,
    };
  }

  async getByMonth(
    month: string,
    userId?: number,
    accountId?: number,
    /**
     * Adds rows on shared accounts. For the transactions list only -- budget
     * totals must stay strictly the viewer's own share.
     */
    includeSharedAccounts = false
  ): Promise<ExpensesByMonthResult> {
    const period = userId != null ? await getBudgetPeriodForUserMonth(month, userId) : undefined;
    const expenses = await this.repo.findByMonth(month, userId, accountId, period, includeSharedAccounts);
    const shares = userId != null
      ? await this.participantRepo.getSharesForExpenses(expenses.map((e) => e.id), userId)
      : new Map<number, number>();
    const totals = {
      overall: 0,
      byUser: {} as Record<number, number>,
      byCategory: {} as Record<number, number>,
    };
    for (const e of expenses) {
      // For a viewer, the number that matters is their own share. Totalling the
      // full amount double-counts every split expense against the category.
      // Falls back to the full amount for pre-backfill rows and for
      // household-wide queries.
      const mine = shares.get(e.id) ?? e.amount;
      e.myShare = mine;
      totals.overall += mine;
      totals.byUser[e.userId] = (totals.byUser[e.userId] ?? 0) + mine;
      totals.byCategory[e.categoryId] = (totals.byCategory[e.categoryId] ?? 0) + mine;
    }
    return { expenses, totals };
  }

  async create(
    userId: number,
    data: Omit<CreateExpenseInput, "userId" | "month"> & { participants?: ParticipantShare[] }
  ): Promise<{ id: number }> {
    const month = await budgetMonthKeyForUser(userId, data.date);
    const participants = data.participants?.length
      ? data.participants
      : [{ userId, shareMinor: data.amount }];
    // Only an explicit list can be wrong. The one-person default is derived
    // from the amount, and validating it would reject the negative amounts
    // that adjustments and repayments legitimately write.
    if (data.participants?.length) {
      const valid = validateParticipantShares(data.amount, participants, userId);
      if (!valid.ok) throw new Error(valid.error);
    }

    // Shared costs filters its history by split group, so a shared spend with
    // no group never appears there. The old createSplit defaulted it; this is
    // the same rule, now that there is one creation path.
    const splitExpenseGroupId =
      participants.length > 1
        ? (data.splitExpenseGroupId ?? (await this.splitGroupRepo.findDefault())?.id ?? null)
        : (data.splitExpenseGroupId ?? null);

    // A shared spend touches two people's balances, so it lands whole or not at
    // all. Half a split is worse than no split: the payer's envelope moves and
    // the debt never appears, and nothing on either screen says so.
    //
    // This used to be four sequential writes followed by three best-effort
    // compensating deletes, each swallowed with `.catch(() => {})` -- so a
    // failed compensation left a half-written spend and said nothing. One
    // transaction is both shorter and actually atomic.
    try {
      return await withTransaction(async () => {
        const { id } = await this.repo.create({
          userId,
          categoryId: data.categoryId,
          amount: data.amount,
          note: data.note,
          date: data.date,
          month,
          accountId: data.accountId ?? null,
          paidByUserId: userId,
          splitGroupId: participants.length > 1 ? crypto.randomUUID() : null,
          splitExpenseGroupId,
          recurringExpenseId: data.recurringExpenseId ?? null,
        });

        await this.participantRepo.createMany(id, participants);

        // Every non-payer share is a debt. split_allocations stays the debt
        // ledger: calculateSplitBalance and the settlement history both read it.
        for (const p of participants) {
          if (p.userId === userId || p.shareMinor <= 0) continue;
          await this.allocationRepo.create(id, p.userId, p.shareMinor);
        }

        if (data.accountId != null) {
          await this.accountTxRepo.create({
            accountId: data.accountId,
            // The full amount left the account, even though only `mine` hit the
            // envelope. That asymmetry is why Home needs a cash-behind-envelopes
            // row, and why the two figures are allowed to disagree.
            amount: -data.amount,
            transactionType: "expense",
            referenceType: "expense",
            referenceId: id,
          });
        }
        return { id };
      });
    } catch (err) {
      const who = participants.length > 1 ? "shared spend" : "spend";
      throw new Error(
        `That ${who} didn't save, so nothing was recorded on anyone's side. ` +
          (err instanceof Error ? err.message : "Try again.")
      );
    }
  }

  /** Who was in on an expense, and for how much. */
  async getParticipants(expenseId: number) {
    return this.participantRepo.findByExpenseId(expenseId);
  }

  async update(id: number, userId: number, data: UpdateExpenseInput): Promise<void> {
    const payload: UpdateExpenseInput = { ...data };
    if (data.date) payload.month = await budgetMonthKeyForUser(userId, data.date);
    await withTransaction(async () => {
      await this.repo.update(id, payload);
      // The ledger has to follow the figure, or correcting a typo silently
      // moves the account balance by the difference. Debits are negative.
      if (data.amount != null) {
        await this.accountTxRepo.updateAmountByReference("expense", id, -data.amount);
      }
    });
  }

  /**
   * Removes the spend and everything raised from it.
   *
   * The ledger row is the part that used to be missed: `create` writes an
   * `account_transactions` debit when the spend is filed against an account,
   * and nothing removed it, so every deleted spend left the account balance
   * understated by its amount -- permanently, because the ledger IS the balance.
   * `expense_participants` and `split_allocations` cascade in the schema.
   */
  async delete(id: number): Promise<void> {
    await withTransaction(async () => {
      await this.accountTxRepo.deleteByReference("expense", id);
      await this.repo.delete(id);
    });
  }

  /**
   * Deletes every expense in a split group, ledger rows included, in one
   * transaction. The old path deleted a single row found with `LIMIT 1` and
   * left any others -- and left every ledger entry behind.
   */
  async deleteBySplitGroup(splitGroupId: string): Promise<void> {
    const ids = await this.repo.findIdsBySplitGroupId(splitGroupId);
    if (ids.length === 0) return;
    await withTransaction(async () => {
      for (const id of ids) {
        await this.accountTxRepo.deleteByReference("expense", id);
        await this.repo.delete(id);
      }
    });
  }
}
