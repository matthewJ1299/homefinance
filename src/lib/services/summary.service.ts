import { getIncomeRepository, getBudgetRepository } from "@/lib/repositories";
import { ExpenseService } from "@/lib/services/expense.service";
import { IncomeService } from "@/lib/services/income.service";
import { calculateMonthlySnapshotArithmetic } from "@/lib/services/finance/accounts";

export interface MonthlySnapshotResult {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  netPosition: number;
  budgetAdherence: Array<{
    categoryName: string;
    assigned: number;
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
    private incomeService = new IncomeService(),
    private incomeRepo = getIncomeRepository(),
    private budgetRepo = getBudgetRepository()
  ) {}

  async getMonthlySnapshot(month: string, userId: number): Promise<MonthlySnapshotResult> {
    const [incomeResult, expenseResult, budgetOverview] = await Promise.all([
      this.incomeService.getByMonth(month, userId),
      this.expenseService.getByMonth(month, userId),
      this.budgetRepo.getAllocationsForMonth(month, userId),
    ]);

    const categoryIdToName = await this.getCategoryNames();
    return calculateMonthlySnapshotArithmetic({
      month,
      incomeEntries: incomeResult.entries,
      totalExpenses: expenseResult.totals.overall,
      spentByCategory: expenseResult.totals.byCategory,
      allocations: budgetOverview.map((a) => ({
        categoryId: a.categoryId,
        allocatedAmount: a.allocatedAmount,
      })),
      categoryIdToName,
      expensesByUser: expenseResult.totals.byUser,
    });
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
