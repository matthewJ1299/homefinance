import { GoogleGenerativeAI } from "@google/generative-ai";
import { BudgetService } from "@/lib/services/budget.service";
import { ExpenseService } from "@/lib/services/expense.service";
import { IncomeService } from "@/lib/services/income.service";
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
}
