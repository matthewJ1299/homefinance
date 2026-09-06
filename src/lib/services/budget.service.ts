import { getBudgetRepository } from "@/lib/repositories";
import { IncomeService } from "@/lib/services/income.service";
import { ExpenseService } from "@/lib/services/expense.service";
import { getCategoryRepository } from "@/lib/repositories";
import { prevMonth } from "@/lib/utils/date";
import { getDefaultBudgetMonthForUser } from "@/lib/utils/budget-month-for-user";
import { withTransaction } from "@/lib/db/postgres-client";
import type { Category } from "@/lib/types";
import type { BudgetAllocationWithMonth } from "@/lib/repositories/interfaces/budget.repository";
import { calculateBudgetOverviewArithmetic } from "@/lib/services/finance/accounts";

/** Max months to look back when resolving carried-over allocations. */
const CARRY_OVER_MONTHS = 12;

export type { BudgetCategoryRow } from "@/lib/services/finance/accounts";
import type { BudgetCategoryRow } from "@/lib/services/finance/accounts";

export interface BudgetTransferDisplay {
  id: number;
  fromCategoryName: string;
  toCategoryName: string;
  amount: number;
  userName: string;
  reason: string | null;
  createdAt: string;
}

export interface BudgetOverviewResult {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  totalAssigned: number;
  /** Sum of (assigned + carriedIn). */
  envelopeTotal: number;
  /** Sum of available -- Home's hero figure. */
  envelopeLeft: number;
  /** Positive sum of negative availables this month. */
  overspentTotal: number;
  /** Uncovered overspend inherited from last month, deducted from unassigned. */
  carriedOverspend: number;
  /** income - assigned - carriedOverspend. Money with no job. */
  unassigned: number;
  /** Whether this month has been opened (carry-in written). */
  isOpened: boolean;
  /** @deprecated alias for `unassigned`. */
  toBeAllocated: number;
  /** @deprecated alias for `unassigned`. */
  unallocated: number;
  /** @deprecated alias for `totalAssigned`. */
  totalAllocated: number;
  isBalanced: boolean;
  categories: BudgetCategoryRow[];
  transfers: BudgetTransferDisplay[];
}

export class BudgetService {
  constructor(
    private budgetRepo = getBudgetRepository(),
    private incomeService = new IncomeService(),
    private expenseService = new ExpenseService(),
    private categoryRepo = getCategoryRepository()
  ) {}

  async getOverview(month: string, userId: number): Promise<BudgetOverviewResult> {
    const monthsToLoad = [month];
    let m = month;
    for (let i = 0; i < CARRY_OVER_MONTHS; i++) {
      m = prevMonth(m);
      monthsToLoad.push(m);
    }

    const [incomeResult, expenseResult, allocationsForMonths, transfers, categories] =
      await Promise.all([
        this.incomeService.getByMonth(month, userId),
        this.expenseService.getByMonth(month, userId),
        this.budgetRepo.getAllocationsForMonths(monthsToLoad, userId),
        this.budgetRepo.getTransfersForMonth(month, userId),
        this.categoryRepo.findAll(),
      ]);

    const totalIncome = incomeResult.totals.overall;
    const totalExpenses = expenseResult.totals.overall;

    const allocationMap = this.resolveEffectiveAllocations(
      month,
      monthsToLoad,
      allocationsForMonths,
      categories
    );

    await this.persistMissingAllocationsForMonth(month, allocationMap, categories, userId);
    const monthState = await this.budgetRepo.getMonthOpenState(month, userId);
    const carriedInMap = await this.budgetRepo.getCarriedInForMonth(month, userId);
    const spentByCategory = expenseResult.totals.byCategory;
    const categoryMeta = new Map(categories.map((c) => [c.id, c]));
    const budgetArithmetic = calculateBudgetOverviewArithmetic({
      totalIncome,
      totalExpenses,
      categories,
      allocationMap,
      carriedInMap,
      expenses: expenseResult.expenses,
      spentByCategory,
    });
    const {
      balance, totalAssigned, envelopeTotal, envelopeLeft, overspentTotal, categoryRows,
    } = budgetArithmetic;
    const carriedOverspend = monthState?.overspendCarriedMinor ?? 0;
    const unassigned = totalIncome - totalAssigned - carriedOverspend;
    const isBalanced = unassigned === 0;

    const transferDisplays: BudgetTransferDisplay[] = await Promise.all(
      transfers.map(async (t) => {
        const fromCat = categoryMeta.get(t.fromCategoryId);
        const toCat = categoryMeta.get(t.toCategoryId);
        return {
          id: t.id,
          fromCategoryName: fromCat?.name ?? "?",
          toCategoryName: toCat?.name ?? "?",
          amount: t.amount,
          userName: String(t.userId),
          reason: t.reason,
          createdAt: t.createdAt,
        };
      })
    );

    const userNames = await this.getUserNamesForTransfers(transfers.map((t) => t.userId));
    transferDisplays.forEach((t, i) => {
      t.userName = userNames[i] ?? String(transfers[i].userId);
    });

    return {
      month,
      totalIncome,
      totalExpenses,
      balance,
      totalAssigned,
      envelopeTotal,
      envelopeLeft,
      overspentTotal,
      carriedOverspend,
      unassigned,
      isOpened: monthState != null,
      toBeAllocated: unassigned,
      unallocated: unassigned,
      totalAllocated: totalAssigned,
      isBalanced,
      categories: categoryRows,
      transfers: transferDisplays,
    };
  }

  /**
   * Resolves effective allocation per category: current month if set, else latest previous month
   * (carry-over), else for fixed categories with defaultAmount use that.
   */
  private resolveEffectiveAllocations(
    currentMonth: string,
    monthsNewestFirst: string[],
    allocations: BudgetAllocationWithMonth[],
    categories: Category[]
  ): Map<number, number> {
    const byCategoryAndMonth = new Map<string, number>();
    for (const a of allocations) {
      byCategoryAndMonth.set(`${a.categoryId}:${a.month}`, a.allocatedAmount);
    }
    const categoryMeta = new Map(categories.map((c) => [c.id, c]));
    const result = new Map<number, number>();
    for (const cat of categories) {
      let amount = 0;
      for (const month of monthsNewestFirst) {
        const key = `${cat.id}:${month}`;
        const value = byCategoryAndMonth.get(key);
        if (value !== undefined) {
          amount = value;
          break;
        }
      }
      if (amount === 0 && cat.costType === "fixed" && cat.defaultAmount != null && cat.defaultAmount > 0) {
        amount = cat.defaultAmount;
      }
      result.set(cat.id, amount);
    }
    return result;
  }

  /** Persist allocation rows for the current month where we have effective amount but no row yet. */
  private async persistMissingAllocationsForMonth(
    month: string,
    allocationMap: Map<number, number>,
    categories: Category[],
    userId: number
  ): Promise<void> {
    const existing = await this.budgetRepo.getAllocationsForMonth(month, userId);
    const existingCategoryIds = new Set(existing.map((a) => a.categoryId));
    for (const cat of categories) {
      const amount = allocationMap.get(cat.id) ?? 0;
      if (amount > 0 && !existingCategoryIds.has(cat.id)) {
        await this.budgetRepo.upsertAllocation(cat.id, month, amount, userId);
      }
    }
  }

  private async getUserNamesForTransfers(userIds: number[]): Promise<string[]> {
    const { all } = await import("@/lib/db");
    const unique = [...new Set(userIds)];
    if (unique.length === 0) return [];
    const placeholders = unique.map(() => "?").join(",");
    const rows = await all<{ id: number; name: string }>(
      `SELECT id, name FROM users WHERE id IN (${placeholders})`,
      unique
    );
    const map = new Map(rows.map((r) => [r.id, r.name]));
    return userIds.map((id) => map.get(id) ?? "?");
  }

  /**
   * Writes carry-in for `month` from the prior month's availables, once.
   * Idempotent: a `budget_month_opens` row is the guard.
   *
   * Positive available carries into the same category (when `rollover`).
   * Negative available does NOT carry into the category -- it is summed and
   * recorded as `overspend_carried_minor`, which `getOverview` deducts from
   * unassigned. A category that reads "over budget" before a rand is spent in
   * the new month would make the one-sentence rule unexplainable.
   */
  async openMonth(month: string, userId: number): Promise<{ opened: boolean; carriedOverspend: number }> {
    const existing = await this.budgetRepo.getMonthOpenState(month, userId);
    if (existing) {
      return { opened: false, carriedOverspend: existing.overspendCarriedMinor };
    }

    const previous = prevMonth(month);
    const prior = await this.getOverview(previous, userId);

    // Materialise the new month's assigned amounts BEFORE writing carry-in.
    // setCarriedIn inserts with allocated_amount 0 when no row exists yet, and
    // resolveEffectiveAllocations stops at the first row it finds walking back
    // -- so a carry-in row written first reads as "assigned nothing this month"
    // and silently discards the template amount the month should have started
    // with. Opening the overview persists those rows, and the ON CONFLICT in
    // setCarriedIn then touches only carried_in_minor.
    await this.getOverview(month, userId);

    let carriedOverspend = 0;
    const carryIn: Array<{ categoryId: number; amount: number }> = [];
    for (const row of prior.categories) {
      if (row.available > 0 && row.rollover) {
        carryIn.push({ categoryId: row.categoryId, amount: row.available });
      } else if (row.available < 0) {
        carriedOverspend += -row.available;
      }
    }

    await withTransaction(async () => {
      for (const { categoryId, amount } of carryIn) {
        await this.budgetRepo.setCarriedIn(categoryId, month, amount, userId);
      }
      await this.budgetRepo.recordMonthOpen(month, userId, carriedOverspend);
    });

    // Recurring templates used to be applied by a "Populate this month" button
    // in Settings, which asked the user to do the thing rather than telling them
    // it had happened. Opening the month is that moment. Idempotent in its own
    // right, and outside the transaction above so a template failure cannot roll
    // back a carry-in that is already correct.
    const { PopulationService } = await import("@/lib/services/population.service");
    await new PopulationService().populateMonth(month, userId);

    return { opened: true, carriedOverspend };
  }

  /** True when the user's budget month has rolled over and they have not seen the summary. */
  async needsMonthOpen(userId: number): Promise<{ month: string; previous: string } | null> {
    const month = await getDefaultBudgetMonthForUser(userId);
    if (await this.budgetRepo.getMonthOpenState(month, userId)) return null;
    const previous = prevMonth(month);
    const priorAllocations = await this.budgetRepo.getAllocationsForMonth(previous, userId);
    if (priorAllocations.length === 0) return null; // first-ever month, nothing to summarise
    return { month, previous };
  }

  /** Moves money between categories to clear an overspend. Thin wrapper over transfer. */
  async coverOverspend(data: {
    fromCategoryId: number;
    toCategoryId: number;
    month: string;
    amount: number;
    userId: number;
  }) {
    return this.transfer({ ...data, reason: "Covering overspend" });
  }

  async setAllocation(categoryId: number, month: string, amount: number, userId: number): Promise<void> {
    await this.budgetRepo.upsertAllocation(categoryId, month, amount, userId);
  }

  /** Number of past months to use for historical spending weights. */
  private static readonly AUTO_ALLOCATE_HISTORY_MONTHS = 6;

  /**
   * Distributes the unallocated remainder across categories that already have an allocation.
   * If historical spending data exists, uses those proportions; otherwise splits evenly.
   */
  async autoAllocate(month: string, userId: number): Promise<
    | { success: true; updated: number }
    | { success: false; error: string }
  > {
    const overview = await this.getOverview(month, userId);
    const remainder = overview.unassigned;
    if (remainder <= 0) {
      return { success: true, updated: 0 };
    }

    const categoriesWithAllocation = overview.categories.filter((c) => c.assigned > 0);
    const recipients =
      categoriesWithAllocation.length > 0
        ? categoriesWithAllocation
        : overview.categories;

    if (recipients.length === 0) {
      return { success: false, error: "No categories to allocate to" };
    }

    const historicalMonths: string[] = [];
    let m = month;
    for (let i = 0; i < BudgetService.AUTO_ALLOCATE_HISTORY_MONTHS; i++) {
      m = prevMonth(m);
      historicalMonths.push(m);
    }
    const historicalByCategory = await this.expenseService.getSpendingByCategoryForMonths(
      historicalMonths,
      userId
    );
    const totalHistorical = recipients.reduce(
      (sum, c) => sum + (historicalByCategory[c.categoryId] ?? 0),
      0
    );

    const weights: { categoryId: number; weight: number }[] = recipients.map((c) => {
      const w =
        totalHistorical > 0
          ? (historicalByCategory[c.categoryId] ?? 0) / totalHistorical
          : 1 / recipients.length;
      return { categoryId: c.categoryId, weight: w };
    });

    const increments = new Map<number, number>();
    let distributed = 0;
    const ordered = [...weights].sort((a, b) => b.weight - a.weight);
    for (const { categoryId, weight } of ordered) {
      const raw = weight * remainder;
      const inc = Math.floor(raw);
      increments.set(categoryId, inc);
      distributed += inc;
    }
    let leftover = remainder - distributed;
    for (const { categoryId } of ordered) {
      if (leftover <= 0) break;
      increments.set(categoryId, (increments.get(categoryId) ?? 0) + 1);
      leftover -= 1;
    }

    for (const cat of overview.categories) {
      const inc = increments.get(cat.categoryId) ?? 0;
      if (inc > 0) {
        const newAmount = cat.assigned + inc;
        await this.budgetRepo.upsertAllocation(cat.categoryId, month, newAmount, userId);
      }
    }

    return { success: true, updated: increments.size };
  }

  async transfer(data: {
    fromCategoryId: number;
    toCategoryId: number;
    month: string;
    amount: number;
    userId: number;
    reason?: string | null;
  }  ): Promise<{ success: true } | { success: false; error: string }> {
    const overview = await this.getOverview(data.month, data.userId);
    const fromRow = overview.categories.find((c) => c.categoryId === data.fromCategoryId);
    const toRow = overview.categories.find((c) => c.categoryId === data.toCategoryId);
    if (!fromRow || !toRow) return { success: false, error: "Category not found" };
    // `available` includes carry-in, which is correct: money carried into Fuel
    // is as spendable as money assigned to it this month.
    if (fromRow.available < data.amount) {
      return { success: false, error: "Insufficient funds in source category" };
    }
    const newFromAllocated = fromRow.assigned - data.amount;
    const newToAllocated = toRow.assigned + data.amount;
    await this.budgetRepo.upsertAllocation(data.fromCategoryId, data.month, newFromAllocated, data.userId);
    await this.budgetRepo.upsertAllocation(data.toCategoryId, data.month, newToAllocated, data.userId);
    await this.budgetRepo.createTransfer(data);
    return { success: true };
  }
}
