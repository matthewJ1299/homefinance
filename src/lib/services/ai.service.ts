import { GoogleGenerativeAI } from "@google/generative-ai";
import { BudgetService, type BudgetOverviewResult } from "@/lib/services/budget.service";
import { ExpenseService } from "@/lib/services/expense.service";
import { IncomeService } from "@/lib/services/income.service";
import { GoalProjectionService } from "@/lib/services/goal-projection.service";
import { formatRand } from "@/lib/utils/currency";
import { prevMonth } from "@/lib/utils/date";
import { getAIAnalysisRunRepository } from "@/lib/repositories";
import type { AIAnalysisType } from "@/lib/repositories/interfaces/ai-analysis-run.repository";
import type { ExpenseWithDetails } from "@/lib/types";
import type { BudgetAnalysisModelPayload, BudgetAnalysisReport } from "@/lib/types/budget-ai-report";
import { buildBudgetAnalysisUserPrompt, getBudgetAnalysisSystemPrompt } from "@/lib/services/ai/budget-analysis-prompts";
import { parseBudgetAnalysisReportFromModelText } from "@/lib/services/ai/parse-budget-analysis-response";

export type AITier = "free" | "paid";

const DEFAULT_FREE_MODEL = "gemini-2.5-flash";
const DEFAULT_PAID_MODEL = "gemini-2.5-flash";

function getModelForTier(tier: AITier): string {
  if (tier === "paid") return (process.env.GEMINI_PAID_MODEL ?? "").trim() || DEFAULT_PAID_MODEL;
  return (process.env.GEMINI_FREE_MODEL ?? "").trim() || DEFAULT_FREE_MODEL;
}

function getApiKeyForTier(tier: AITier): string | null {
  if (tier === "paid") return process.env.GEMINI_PAID_API_KEY?.trim() || null;
  return process.env.GEMINI_FREE_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim() || null;
}

export function isAIConfiguredForTier(tier: AITier): boolean {
  return Boolean(getApiKeyForTier(tier));
}

export function isAIConfigured(): boolean {
  return isAIConfiguredForTier("free") || isAIConfiguredForTier("paid");
}

export interface AnalyzeExpensesResult {
  success: true;
  report: BudgetAnalysisReport;
  rawModelText: string;
  inputText: string;
}

export interface AnalyzeExpensesError {
  success: false;
  error: string;
}

export type AnalyzeExpensesOutcome = AnalyzeExpensesResult | AnalyzeExpensesError;

export interface AnalyzeGoalsResult {
  success: true;
  analysis: string;
  inputText: string;
}

export interface AnalyzeGoalsError {
  success: false;
  error: string;
}

export type AnalyzeGoalsOutcome = AnalyzeGoalsResult | AnalyzeGoalsError;

function buildBudgetAnalysisModelPayload(params: {
  month: string;
  overview: BudgetOverviewResult;
  incomeCents: number;
  expenseRows: ExpenseWithDetails[];
  prevMonthSpentByCategory: Record<number, number>;
}): BudgetAnalysisModelPayload {
  const categories = params.overview.categories
    .filter((c) => c.allocated > 0 || c.spent > 0)
    .map((c) => ({
      name: c.categoryName,
      allocated_cents: c.allocated,
      spent_cents: c.spent,
      prev_month_spent_cents: params.prevMonthSpentByCategory[c.categoryId] ?? 0,
      is_overspent: c.isOverspent,
    }));

  const transactions = params.expenseRows.map((e) => ({
    user_name: e.userName,
    category_name: e.categoryName,
    amount_cents: e.amount,
    note: e.note ?? "",
    date: e.date,
  }));

  return {
    month: params.month,
    currency: "ZAR",
    income_cents: params.incomeCents,
    expenses_cents: params.overview.totalExpenses,
    allocated_cents: params.overview.totalAllocated,
    unallocated_cents: params.overview.unallocated,
    categories,
    transactions,
  };
}

function buildGoalsAndDebtAnalysisPrompt(data: unknown): string {
  return `You are a personal finance advisor. Respond in plain text (no markdown). Keep it concise (under 300 words).

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
}

function isMissingDbObjectError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    (error.code === "42P01" || error.code === "42703")
  );
}

async function persistAIAnalysisRun(params: {
  userId: number;
  analysisType: AIAnalysisType;
  month: string;
  promptTemplateId: string;
  promptVersion: number;
  inputJson: unknown;
  inputText?: string;
  outputText: string;
}): Promise<void> {
  try {
    await getAIAnalysisRunRepository().create({
      userId: params.userId,
      analysisType: params.analysisType,
      month: params.month,
      promptTemplateId: params.promptTemplateId,
      promptVersion: params.promptVersion,
      inputJson: params.inputJson,
      inputText: params.inputText,
      outputText: params.outputText,
    });
  } catch (error) {
    if (isMissingDbObjectError(error)) {
      console.warn("AI analysis logging skipped: run `npm run db:push` to apply DB migrations.");
      return;
    }
    throw error;
  }
}

export class AIService {
  async analyzeExpenses(
    month: string,
    userId: number,
    tier: AITier = "free"
  ): Promise<AnalyzeExpensesOutcome> {
    const apiKey = getApiKeyForTier(tier);
    if (!apiKey) {
      return {
        success: false,
        error:
          tier === "paid"
            ? "Paid AI is not configured. Set GEMINI_PAID_API_KEY."
            : "AI is not configured. Set GEMINI_FREE_API_KEY (or GEMINI_API_KEY).",
      };
    }

    const budgetService = new BudgetService();
    const expenseService = new ExpenseService();
    const incomeService = new IncomeService();
    const priorKey = prevMonth(month);

    const [overview, incomeResult, expenseResult, priorExpenseResult] = await Promise.all([
      budgetService.getOverview(month, userId),
      incomeService.getByMonth(month, userId),
      expenseService.getByMonth(month, userId),
      expenseService.getByMonth(priorKey, userId),
    ]);

    const data = buildBudgetAnalysisModelPayload({
      month,
      overview,
      incomeCents: incomeResult.totals.overall,
      expenseRows: expenseResult.expenses,
      prevMonthSpentByCategory: priorExpenseResult.totals.byCategory,
    });

    const systemPrompt = getBudgetAnalysisSystemPrompt();
    const userPrompt = buildBudgetAnalysisUserPrompt(data);
    const inputDebugText = `--- system ---\n${systemPrompt}\n\n--- user ---\n${userPrompt}`;

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: getModelForTier(tier),
        systemInstruction: systemPrompt,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.4,
        },
      });
      const result = await model.generateContent(userPrompt);
      const text = result.response?.text() ?? "";
      if (typeof text !== "string" || !text.trim()) {
        return { success: false, error: "No analysis was returned." };
      }
      const analysisText = text.trim();
      let report: BudgetAnalysisReport;
      try {
        report = parseBudgetAnalysisReportFromModelText(analysisText);
      } catch {
        return {
          success: false,
          error:
            "AI returned a response that could not be parsed as the expected JSON report. Try again, or open the input log to inspect the model output.",
        };
      }
      await persistAIAnalysisRun({
        userId,
        analysisType: "expenses_monthly",
        month,
        promptTemplateId: "expenses_monthly",
        promptVersion: 3,
        inputJson: data,
        inputText: inputDebugText,
        outputText: analysisText,
      });
      return { success: true, report, rawModelText: analysisText, inputText: inputDebugText };
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI request failed.";
      return { success: false, error: message };
    }
  }

  async analyzeGoalsAndDebt(
    month: string,
    userId: number,
    tier: AITier = "free"
  ): Promise<AnalyzeGoalsOutcome> {
    const apiKey = getApiKeyForTier(tier);
    if (!apiKey) {
      return {
        success: false,
        error:
          tier === "paid"
            ? "Paid AI is not configured. Set GEMINI_PAID_API_KEY."
            : "AI is not configured. Set GEMINI_FREE_API_KEY (or GEMINI_API_KEY).",
      };
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

    const prompt = buildGoalsAndDebtAnalysisPrompt(data);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: getModelForTier(tier) });
      const result = await model.generateContent(prompt);
      const text = result.response?.text() ?? "";
      if (typeof text !== "string" || !text.trim()) {
        return { success: false, error: "No analysis was returned." };
      }
      const analysisText = text.trim();
      await persistAIAnalysisRun({
        userId,
        analysisType: "goals_and_debt_monthly",
        month,
        promptTemplateId: "goals_and_debt_monthly",
        promptVersion: 1,
        inputJson: data,
        inputText: undefined,
        outputText: analysisText,
      });
      return { success: true, analysis: analysisText, inputText: prompt };
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI request failed.";
      return { success: false, error: message };
    }
  }
}
