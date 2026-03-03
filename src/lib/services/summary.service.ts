import { getIncomeRepository, getBudgetRepository } from "@/lib/repositories";
import { ExpenseService } from "@/lib/services/expense.service";

export interface MonthlySnapshotResult {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  netPosition: number;
  budgetAdherence: Array<{
    categoryName: string;
    allocated: number;
    spent: number;
    adherencePct: number;
  }>;
  expensesByUser: Record<number, number>;
  incomeByUser: Record<number, number>;
}

export interface TrendMonthResult {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  netPosition: number;
  byCategory: Record<string, number>;
}

export class SummaryService {
  constructor(
    private expenseService = new ExpenseService(),
    private incomeRepo = getIncomeRepository(),
    private budgetRepo = getBudgetRepository()
  ) {}

  async getMonthlySnapshot(month: string): Promise<MonthlySnapshotResult> {
    const [incomeResult, expenseResult, budgetOverview] = await Promise.all([
      this.incomeRepo.findByMonth(month),
      this.expenseService.getByMonth(month),
      this.budgetRepo.getAllocationsForMonth(month),
    ]);

    const totalIncome = incomeResult.reduce((s, e) => s + e.amount, 0);
    const totalExpenses = expenseResult.totals.overall;
    const netPosition = totalIncome - totalExpenses;

    const spentByCategory = expenseResult.totals.byCategory;
    const allocationMap = new Map(
      budgetOverview.map((a) => [a.categoryId, a.allocatedAmount])
    );

    const categoryNames = await this.getCategoryNames();
    const categoryIds = new Set([
      ...Object.keys(spentByCategory).map(Number),
      ...allocationMap.keys(),
    ]);
    const budgetAdherence = Array.from(categoryIds).map((categoryId) => {
      const allocated = allocationMap.get(categoryId) ?? 0;
      const spent = spentByCategory[categoryId] ?? 0;
      const name = categoryNames.get(categoryId) ?? "?";
      const adherencePct = allocated > 0 ? (spent / allocated) * 100 : 0;
      return { categoryName: name, allocated, spent, adherencePct };
    });

    const expensesByUser = expenseResult.totals.byUser;
    const incomeByUser: Record<number, number> = {};
    for (const e of incomeResult) {
      incomeByUser[e.userId] = (incomeByUser[e.userId] ?? 0) + e.amount;
    }

    return {
      month,
      totalIncome,
      totalExpenses,
      netPosition,
      budgetAdherence,
      expensesByUser,
      incomeByUser,
    };
  }

  async getTrends(from: string, to: string): Promise<{ months: TrendMonthResult[] }> {
    const months = this.getMonthRange(from, to);
    const results: TrendMonthResult[] = [];

    for (const month of months) {
      const incomeEntries = await this.incomeRepo.findByMonth(month);
      const expenseResult = await this.expenseService.getByMonth(month);
      const totalIncome = incomeEntries.reduce((s, e) => s + e.amount, 0);
      const totalExpenses = expenseResult.totals.overall;
      const byCategory: Record<string, number> = {};
      const categoryNames = await this.getCategoryNames();
      for (const [catId, amount] of Object.entries(expenseResult.totals.byCategory)) {
        const name = categoryNames.get(Number(catId)) ?? "?";
        byCategory[name] = (byCategory[name] ?? 0) + amount;
      }
      results.push({
        month,
        totalIncome,
        totalExpenses,
        netPosition: totalIncome - totalExpenses,
        byCategory,
      });
    }

    return { months: results };
  }

  private getMonthRange(from: string, to: string): string[] {
    const [fy, fm] = from.split("-").map(Number);
    const [ty, tm] = to.split("-").map(Number);
    const out: string[] = [];
    let y = fy;
    let m = fm;
    while (y < ty || (y === ty && m <= tm)) {
      out.push(`${y}-${String(m).padStart(2, "0")}`);
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
    return out;
  }

  private async getCategoryNames(): Promise<Map<number, string>> {
    const { getCategoryRepository } = await import("@/lib/repositories");
    const categories = await getCategoryRepository().findAll();
    return new Map(categories.map((c) => [c.id, c.name]));
  }
}
