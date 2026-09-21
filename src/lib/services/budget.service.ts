import { getBudgetRepository } from "@/lib/repositories";
import { IncomeService } from "@/lib/services/income.service";
import { ExpenseService } from "@/lib/services/expense.service";
import { getCategoryRepository, getUserRepository } from "@/lib/repositories";
import { prevMonth } from "@/lib/utils/date";
import { getDefaultBudgetMonthForUser } from "@/lib/utils/budget-month-for-user";
import { withTransaction } from "@/lib/db";
import type { Category } from "@/lib/types";
import type { BudgetAllocationWithMonth } from "@/lib/repositories/interfaces/budget.repository";
import { calculateBudgetOverviewArithmetic } from "@/lib/services/finance/accounts";
import { computeSpreadIncrements } from "@/lib/services/finance/spread";
import { incomeKindLabel } from "@/lib/types/income-type";

/** Max months to look back when resolving carried-over allocations. */
const CARRY_OVER_MONTHS = 12;

/** `month` first, then the carry window behind it, newest to oldest. */
function monthsBackFrom(month: string): string[] {
  const months = [month];
  let m = month;
  for (let i = 0; i < CARRY_OVER_MONTHS; i++) {
    m = prevMonth(m);
    months.push(m);
  }
  return months;
}

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

/** One line of the "where did this money come from" breakdown -- the signed-in
 *  user's own income, itemised so the headline figure can be traced. */
export interface BudgetIncomeBreakdownEntry {
  id: number;
  /** The user's own label, or the kind ("Salary", "Bonus"...) when they gave none. */
  label: string;
  /** The kind label, shown as the entry's type. */
  kindLabel: string;
  amount: number;
  date: string;
}

export interface BudgetIncomeBreakdown {
  total: number;
  entries: BudgetIncomeBreakdownEntry[];
}

/** One category's share of a "Spread it for me" run, for the preview and the write. */
export interface SpreadPlanItem {
  categoryId: number;
  categoryName: string;
  currentAssigned: number;
  increment: number;
  newAssigned: number;
}

export interface SpreadPlan {
  month: string;
  /** The unassigned remainder being distributed. */
  total: number;
  /** True when weights came from real spending history, false when split evenly. */
  weightedByHistory: boolean;
  items: SpreadPlanItem[];
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
  /** The signed-in user's own income feeding `unassigned`, itemised. Sums to `totalIncome`. */
  incomeBreakdown: BudgetIncomeBreakdown;
  /** Positive leftover that rolled into envelopes from last month. Context only --
   *  it is NOT part of `unassigned` (that money already has a job). */
  rolledIntoEnvelopes: number;
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
    private categoryRepo = getCategoryRepository(),
    private userRepo = getUserRepository()
  ) {}

  async getOverview(month: string, userId: number): Promise<BudgetOverviewResult> {
    const monthsToLoad = monthsBackFrom(month);

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

    // No write here. `getOverview` is called from Home, Budget, Goals and the AI
    // service, so persisting allocation rows made every page render a mutation:
    // two concurrent loads raced on the same rows, and a read that writes cannot
    // be cached or served from a replica. Materialising is `openMonth`'s job --
    // the one place that is already the write path.
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

    // Itemise the money feeding `unassigned` so the headline can be traced. The
    // entries are the signed-in user's own income (getByMonth is user-scoped),
    // and their sum is `totalIncome` by construction, so the statement reconciles.
    const incomeBreakdown: BudgetIncomeBreakdown = {
      total: totalIncome,
      entries: incomeResult.entries.map((e) => ({
        id: e.id,
        label: e.description?.trim() || incomeKindLabel(e.incomeKind),
        kindLabel: incomeKindLabel(e.incomeKind),
        amount: e.amount,
        date: e.date,
      })),
    };
    // Positive leftovers that rolled into their envelopes last month. Shown as
    // context beside the figure, never added into it -- that money has a job.
    let rolledIntoEnvelopes = 0;
    for (const v of carriedInMap.values()) if (v > 0) rolledIntoEnvelopes += v;

    // One batched, tenant-scoped lookup. This was a `Promise.all` over an async
    // map with nothing awaited inside it, followed by a second pass that patched
    // the names back in.
    const userNames = await this.userRepo.namesByIds(transfers.map((t) => t.userId));
    const transferDisplays: BudgetTransferDisplay[] = transfers.map((t) => ({
      id: t.id,
      fromCategoryName: categoryMeta.get(t.fromCategoryId)?.name ?? "?",
      toCategoryName: categoryMeta.get(t.toCategoryId)?.name ?? "?",
      amount: t.amount,
      userName: userNames.get(t.userId) ?? String(t.userId),
      reason: t.reason,
      createdAt: t.createdAt,
    }));

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
      incomeBreakdown,
      rolledIntoEnvelopes,
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

  /**
   * Writes the rows a month starts with: for each category, the effective
   * assignment carried forward from the last month that had one (or the fixed
   * default), where no row for this month exists yet.
   *
   * Called only from `openMonth`. It used to run inside `getOverview`, which
   * meant every dashboard render wrote to the database.
   *
   * Loads only what the allocation map needs -- no income, no expenses, no
   * transfers -- because `openMonth` previously ran a whole second `getOverview`
   * purely for this side effect.
   */
  private async materialiseAllocationsForMonth(month: string, userId: number): Promise<void> {
    const monthsToLoad = monthsBackFrom(month);
    const [allocationsForMonths, categories] = await Promise.all([
      this.budgetRepo.getAllocationsForMonths(monthsToLoad, userId),
      this.categoryRepo.findAll(),
    ]);
    const allocationMap = this.resolveEffectiveAllocations(
      month,
      monthsToLoad,
      allocationsForMonths,
      categories
    );

    const existingCategoryIds = new Set(
      allocationsForMonths.filter((a) => a.month === month).map((a) => a.categoryId)
    );
    const missing = categories
      .map((cat) => ({ id: cat.id, amount: allocationMap.get(cat.id) ?? 0 }))
      .filter((c) => c.amount > 0 && !existingCategoryIds.has(c.id));
    if (missing.length === 0) return;

    // One transaction: a month that starts half-assigned reads as money that
    // vanished, and the next `openMonth` would carry that forward.
    await withTransaction(async () => {
      for (const c of missing) {
        await this.budgetRepo.upsertAllocation(c.id, month, c.amount, userId);
      }
    });
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
    // with. The ON CONFLICT in setCarriedIn then touches only carried_in_minor.
    await this.materialiseAllocationsForMonth(month, userId);

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

  /**
   * The oldest month within the carry window that has an assignment of its own,
   * or null when there is no history at all. This is what separates "the very
   * first month" from "a month nobody opened" -- both have no rows of their
   * own, and only the first should stop a carry chain.
   */
  private async earliestAssignedMonth(from: string, userId: number): Promise<string | null> {
    const window: string[] = [];
    let cursor = from;
    for (let i = 0; i <= CARRY_OVER_MONTHS; i++) {
      window.push(cursor);
      cursor = prevMonth(cursor);
    }
    const history = await this.budgetRepo.getAllocationsForMonths(window, userId);
    if (history.length === 0) return null;
    return history.reduce((min, a) => (a.month < min ? a.month : min), history[0].month);
  }

  /**
   * Opens every unopened month from the oldest gap forward.
   *
   * Order is the whole point: `openMonth(M)` reads M-1's availables, so opening
   * M before M-1 reads a carry-in of zero and drops the chain. Someone who skips
   * a month should still find their leftover waiting.
   */
  async openMonthBacklog(
    userId: number,
    /** The newest month to open. Defaults to the live budget month. */
    upTo?: string
  ): Promise<{ opened: string[]; carriedOverspend: number }> {
    const current = upTo ?? (await getDefaultBudgetMonthForUser(userId));

    const earliest = await this.earliestAssignedMonth(current, userId);
    if (earliest == null) return { opened: [], carriedOverspend: 0 };

    const pending: string[] = [];
    let m = current;
    for (let i = 0; i < CARRY_OVER_MONTHS; i++) {
      if (await this.budgetRepo.getMonthOpenState(m, userId)) break;
      // Is there anything BEHIND this month to carry? Asking whether the
      // previous month has rows of its own is the wrong question: a month
      // nobody opened has none, which is exactly the case being repaired.
      if (prevMonth(m) < earliest) break; // first-ever month
      pending.push(m);
      m = prevMonth(m);
    }

    const opened: string[] = [];
    let carriedOverspend = 0;
    for (const month of pending.reverse()) {
      const res = await this.openMonth(month, userId);
      if (res.opened) {
        opened.push(month);
        carriedOverspend = res.carriedOverspend; // the newest month's is the live one
      }
    }
    return { opened, carriedOverspend };
  }

  /** True when the user's budget month has rolled over and they have not seen the summary. */
  async needsMonthOpen(
    userId: number
  ): Promise<{ month: string; previous: string; skippedMonths: string[] } | null> {
    const month = await getDefaultBudgetMonthForUser(userId);
    if (await this.budgetRepo.getMonthOpenState(month, userId)) return null;
    const previous = prevMonth(month);
    const earliest = await this.earliestAssignedMonth(month, userId);
    // First-ever month, nothing to summarise. Note this asks for history
    // anywhere behind `month`, not rows in `previous` specifically -- after a
    // gap `previous` has none, and the card has to fire then most of all.
    if (earliest == null || earliest > previous) return null;

    // Months between the last one they opened and this one. Named so the card
    // can say "two months at once" instead of quietly rolling them up.
    const skippedMonths: string[] = [];
    let m = previous;
    for (let i = 0; i < CARRY_OVER_MONTHS; i++) {
      if (await this.budgetRepo.getMonthOpenState(m, userId)) break;
      if (prevMonth(m) < earliest) break;
      skippedMonths.unshift(m);
      m = prevMonth(m);
    }
    return { month, previous, skippedMonths };
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

  /**
   * Clears the entire envelope layer for one user in the current household:
   * every assignment and carry-in, every month-open marker, and every budget
   * transfer, across all months.
   *
   * Deliberately does NOT touch expenses, income, accounts or categories -- this
   * resets the budget the figures are computed *from*, not the financial history
   * itself. After it runs the user starts assigning from an empty slate; a fixed
   * category with a default template will re-fill only when a month is next
   * opened, which is `materialiseAllocationsForMonth`'s existing behaviour.
   *
   * All three deletes run in one transaction: a half-cleared budget (transfers
   * gone but assignments left, say) is itself a wonky state, and the next
   * `openMonth` would carry it forward.
   */
  async resetBudget(userId: number): Promise<void> {
    await withTransaction(async () => {
      await this.budgetRepo.deleteTransfersForUser(userId);
      await this.budgetRepo.deleteMonthOpensForUser(userId);
      await this.budgetRepo.deleteAllocationsForUser(userId);
    });
  }

  /** Number of past months to use for historical spending weights. */
  private static readonly AUTO_ALLOCATE_HISTORY_MONTHS = 6;

  /**
   * The plan a "Spread it for me" run would apply, without writing anything.
   * Distributes the unassigned remainder across categories that already have an
   * allocation, weighted by the last few months of spending (even split when
   * there is no history). Returns null when there is nothing to spread. Powers
   * the preview; `autoAllocate` recomputes and writes on confirm.
   */
  async computeSpreadPlan(month: string, userId: number): Promise<SpreadPlan | null> {
    const overview = await this.getOverview(month, userId);
    return this.planSpread(overview, month, userId);
  }

  private async planSpread(
    overview: BudgetOverviewResult,
    month: string,
    userId: number
  ): Promise<SpreadPlan | null> {
    const remainder = overview.unassigned;
    if (remainder <= 0) return null;

    const categoriesWithAllocation = overview.categories.filter((c) => c.assigned > 0);
    const recipients =
      categoriesWithAllocation.length > 0 ? categoriesWithAllocation : overview.categories;
    if (recipients.length === 0) return null;

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

    const { increments, weightedByHistory } = computeSpreadIncrements(
      recipients.map((c) => c.categoryId),
      historicalByCategory,
      remainder
    );

    const byId = new Map(recipients.map((c) => [c.categoryId, c]));
    const items: SpreadPlanItem[] = increments.map(({ categoryId, increment }) => {
      const row = byId.get(categoryId)!;
      return {
        categoryId,
        categoryName: row.categoryName,
        currentAssigned: row.assigned,
        increment,
        newAssigned: row.assigned + increment,
      };
    });
    return { month, total: remainder, weightedByHistory, items };
  }

  /**
   * Applies a spread: recomputes the plan (so the write reflects the live state,
   * not a stale preview) and writes it in one transaction. A half-applied spread
   * would leave the remainder wrong and the next run would spread a figure that
   * no longer matches the envelopes.
   */
  async autoAllocate(month: string, userId: number): Promise<
    | { success: true; updated: number }
    | { success: false; error: string }
  > {
    const overview = await this.getOverview(month, userId);
    if (overview.unassigned <= 0) return { success: true, updated: 0 };
    const plan = await this.planSpread(overview, month, userId);
    if (!plan) return { success: false, error: "No categories to allocate to" };
    await withTransaction(async () => {
      for (const item of plan.items) {
        await this.budgetRepo.upsertAllocation(item.categoryId, month, item.newAssigned, userId);
      }
    });
    return { success: true, updated: plan.items.length };
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
    // Spend this month's assignment first, carry-in second. Writing the whole
    // amount against `assigned` is what let it go negative: a category funded
    // entirely by carry-in has assigned 0 and available 500, and 0 - 300 is a
    // negative assignment that inflates `unassigned` by the same 300.
    // `Math.max(0, ...)` because rows written negative by the old code are
    // still out there: a negative `assigned` would otherwise make `fromCarry`
    // exceed the transfer and over-debit the carry-in.
    const fromAssignment = Math.min(Math.max(0, fromRow.assigned), data.amount);
    const fromCarry = data.amount - fromAssignment;

    await withTransaction(async () => {
      await this.budgetRepo.upsertAllocation(
        data.fromCategoryId,
        data.month,
        fromRow.assigned - fromAssignment,
        data.userId
      );
      if (fromCarry > 0) {
        await this.budgetRepo.adjustCarriedIn(
          data.fromCategoryId,
          data.month,
          -fromCarry,
          data.userId
        );
      }
      await this.budgetRepo.upsertAllocation(
        data.toCategoryId,
        data.month,
        toRow.assigned + data.amount,
        data.userId
      );
      await this.budgetRepo.createTransfer(data);
    });
    return { success: true };
  }
}
