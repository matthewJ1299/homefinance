import { getBudgetRepository } from "@/lib/repositories";
import { IncomeService } from "@/lib/services/income.service";
import { ExpenseService } from "@/lib/services/expense.service";
import { getCategoryRepository } from "@/lib/repositories";
import { prevMonth } from "@/lib/utils/date";
import type { Category } from "@/lib/types";
import type { BudgetAllocationWithMonth } from "@/lib/repositories/interfaces/budget.repository";

/** Max months to look back when resolving carried-over allocations. */
const CARRY_OVER_MONTHS = 12;

export interface BudgetCategoryRow {
  categoryId: number;
  categoryName: string;
  groupName: string;
  costType: "fixed" | "variable";
  allocated: number;
  spent: number;
  remaining: number;
  isOverspent: boolean;
  spentByUser: Record<number, number>;
}

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
  totalAllocated: number;
  unallocated: number;
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
    const balance = totalIncome - totalExpenses;

    const allocationMap = this.resolveEffectiveAllocations(
      month,
      monthsToLoad,
      allocationsForMonths,
      categories
    );

    await this.persistMissingAllocationsForMonth(month, allocationMap, categories, userId);
    const spentByCategory = expenseResult.totals.byCategory;
    const categoryMeta = new Map(categories.map((c) => [c.id, c]));

    let totalAllocated = 0;
    const categoryRows: BudgetCategoryRow[] = categories.map((cat) => {
      const allocated = allocationMap.get(cat.id) ?? 0;
      const spent = spentByCategory[cat.id] ?? 0;
      totalAllocated += allocated;
      const remaining = allocated - spent;
      const spentByUser: Record<number, number> = {};
      for (const e of expenseResult.expenses) {
        if (e.categoryId === cat.id) {
          spentByUser[e.userId] = (spentByUser[e.userId] ?? 0) + e.amount;
        }
      }
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        groupName: cat.groupName,
        costType: cat.costType ?? "variable",
        allocated,
        spent,
        remaining,
        isOverspent: remaining < 0,
        spentByUser,
      };
    });

    const unallocated = totalIncome - totalAllocated;
    const isBalanced = unallocated === 0;

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
      totalAllocated,
      unallocated,
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
    const remainder = overview.unallocated;
    if (remainder <= 0) {
      return { success: true, updated: 0 };
    }

    const categoriesWithAllocation = overview.categories.filter((c) => c.allocated > 0);
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
        const newAmount = cat.allocated + inc;
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
    if (fromRow.remaining < data.amount) {
      return { success: false, error: "Insufficient funds in source category" };
    }
    const newFromAllocated = fromRow.allocated - data.amount;
    const newToAllocated = toRow.allocated + data.amount;
    await this.budgetRepo.upsertAllocation(data.fromCategoryId, data.month, newFromAllocated, data.userId);
    await this.budgetRepo.upsertAllocation(data.toCategoryId, data.month, newToAllocated, data.userId);
    await this.budgetRepo.createTransfer(data);
    return { success: true };
  }
}
