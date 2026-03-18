import { GoogleGenerativeAI } from "@google/generative-ai";
import { BudgetService } from "@/lib/services/budget.service";
import { ExpenseService } from "@/lib/services/expense.service";
import { IncomeService } from "@/lib/services/income.service";
import { GoalProjectionService } from "@/lib/services/goal-projection.service";
import { formatRand } from "@/lib/utils/currency";

/** Best free-tier model: most capable, slower. Free tier: 5 RPM, 100 RPD. */
const MODEL = "gemini-2.5-flash";

export interface AnalyzeExpensesResult {
  success: true;
  analysis: string;
}

export interface AnalyzeExpensesError {
  success: false;
  error: string;
}

export type AnalyzeExpensesOutcome = AnalyzeExpensesResult | AnalyzeExpensesError;

export interface AnalyzeGoalsResult {
  success: true;
  analysis: string;
}

export interface AnalyzeGoalsError {
  success: false;
  error: string;
}

export type AnalyzeGoalsOutcome = AnalyzeGoalsResult | AnalyzeGoalsError;

export function isAIConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export class AIService {
  async analyzeExpenses(month: string, userId: number): Promise<AnalyzeExpensesOutcome> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return { success: false, error: "AI is not configured. Set GEMINI_API_KEY." };
    }

    const budgetService = new BudgetService();
    const expenseService = new ExpenseService();
    const incomeService = new IncomeService();

    const [overview, incomeResult] = await Promise.all([
      budgetService.getOverview(month, userId),
      incomeService.getByMonth(month, userId),
    ]);

    const categorySummary = overview.categories
      .filter((c) => c.allocated > 0 || c.spent > 0)
      .map((c) => ({
        name: c.categoryName,
        allocated: formatRand(c.allocated),
        spent: formatRand(c.spent),
        remaining: formatRand(c.remaining),
        isOverspent: c.isOverspent,
      }));

    const data = {
      month,
      totalIncome: formatRand(incomeResult.totals.overall),
      totalExpenses: formatRand(overview.totalExpenses),
      balance: formatRand(overview.balance),
      totalAllocated: formatRand(overview.totalAllocated),
      unallocated: formatRand(overview.unallocated),
      categories: categorySummary,
    };

    const prompt = `You are a personal finance assistant. Analyze this household budget summary for ${month} and respond in plain text (no markdown). Keep the response concise (under 300 words). Cover:

1. Spending patterns: How did spending compare to allocations? Which categories stood out?
2. Budget advice: Any suggestions to reallocate or reduce spending next month?
3. Anomalies: Anything unusual (e.g. one category much higher than usual)?

Data (amounts in ZAR):
${JSON.stringify(data, null, 2)}`;

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: MODEL });
      const result = await model.generateContent(prompt);
      const text = result.response?.text() ?? "";
      if (typeof text !== "string" || !text.trim()) {
        return { success: false, error: "No analysis was returned." };
      }
      return { success: true, analysis: text.trim() };
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI request failed.";
      return { success: false, error: message };
    }
  }

  async analyzeGoalsAndDebt(month: string, userId: number): Promise<AnalyzeGoalsOutcome> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return { success: false, error: "AI is not configured. Set GEMINI_API_KEY." };
    }

    const budgetService = new BudgetService();
    const incomeService = new IncomeService();
    const goalsService = new GoalProjectionService();

    const [overview, incomeResult, goalsSummary] = await Promise.all([
      budgetService.getOverview(month, userId),
      incomeService.getByMonth(month, userId),
      goalsService.getDashboardSummary(userId, month),
    ]);

    const data = {
      month,
      totals: {
        totalIncome: formatRand(incomeResult.totals.overall),
        totalExpenses: formatRand(overview.totalExpenses),
        balance: formatRand(overview.balance),
        unallocated: formatRand(overview.unallocated),
      },
      savingsGoals: goalsSummary.savings.map((s) => ({
        name: s.goal.name,
        progress: `${Math.round(s.progressPct * 100)}%`,
        current: formatRand(s.current),
        target: formatRand(s.target),
        monthlyTarget: formatRand(s.monthlyTarget),
        monthlyActual: formatRand(s.monthlyActual),
        projectedCompletionMonth: s.projectedCompletionMonth,
      })),
      creditGoals: goalsSummary.credit.map((c) => ({
        name: c.goal.name,
        balance: formatRand(c.balance),
        debt: formatRand(c.debt),
        monthlyTarget: formatRand(c.monthlyTarget),
        payoffMonths: c.payoffMonths,
        totalInterest: formatRand(c.totalInterest),
        recommendedStrategy: c.recommendedStrategy.best,
      })),
      budgetCategories: overview.categories
        .filter((c) => c.allocated > 0 || c.spent > 0)
        .map((c) => ({
          name: c.categoryName,
          allocated: formatRand(c.allocated),
          spent: formatRand(c.spent),
          remaining: formatRand(c.remaining),
          isOverspent: c.isOverspent,
        })),
    };

    const prompt = `You are a personal finance advisor. Respond in plain text (no markdown). Keep it concise (under 300 words).

IMPORTANT RULES:
- Do NOT compute balances, projections, or payoff math yourself.
- Treat the provided numbers as the source of truth.
- Your job is to suggest actions and trade-offs (budget shifts, payment adjustments) and explain them clearly.

Questions to answer:
1) Am I on track for my savings goals? If not, what should I adjust this month?
2) Am I paying down debt fast enough? What single change would help most?
3) Suggest 2-3 concrete budget shifts (with tradeoffs) to improve outcomes.

Data (amounts in ZAR):
${JSON.stringify(data, null, 2)}`;

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: MODEL });
      const result = await model.generateContent(prompt);
      const text = result.response?.text() ?? "";
      if (typeof text !== "string" || !text.trim()) {
        return { success: false, error: "No analysis was returned." };
      }
      return { success: true, analysis: text.trim() };
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI request failed.";
      return { success: false, error: message };
    }
  }
}
