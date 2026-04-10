import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
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
const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";

type AIProviderLabel =
  | "OpenAI (paid)"
  | "Gemini (paid)"
  | "Gemini (free)"
  | "Gemini (free fallback from OpenAI quota)";

function getModelForTier(tier: AITier): string {
  if (tier === "paid") return (process.env.GEMINI_PAID_MODEL ?? "").trim() || DEFAULT_PAID_MODEL;
  return (process.env.GEMINI_FREE_MODEL ?? "").trim() || DEFAULT_FREE_MODEL;
}

function getApiKeyForTier(tier: AITier): string | null {
  if (tier === "paid") return process.env.GEMINI_PAID_API_KEY?.trim() || null;
  return process.env.GEMINI_FREE_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim() || null;
}

function getOpenAIApiKey(): string | null {
  return process.env.OPENAI_API_KEY?.trim() || null;
}

function getOpenAIModel(): string {
  return (process.env.OPENAI_MODEL ?? "").trim() || DEFAULT_OPENAI_MODEL;
}

export function isAIConfiguredForTier(tier: AITier): boolean {
  if (tier === "paid") {
    return Boolean(getOpenAIApiKey() || getApiKeyForTier("paid"));
  }
  return Boolean(getApiKeyForTier("free"));
}

export function isAIConfigured(): boolean {
  return isAIConfiguredForTier("free") || isAIConfiguredForTier("paid");
}

export interface AnalyzeExpensesResult {
  success: true;
  report: BudgetAnalysisReport;
  rawModelText: string;
  inputText: string;
  runId: number;
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
  includeTransactions: boolean;
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

  const transactions = params.includeTransactions
    ? params.expenseRows.map((e) => ({
        user_name: e.userName,
        category_name: e.categoryName,
        amount_cents: e.amount,
        note: e.note ?? "",
        date: e.date,
      }))
    : [];

  return {
    month: params.month,
    currency: "ZAR",
    income_cents: params.incomeCents,
    expenses_cents: params.overview.totalExpenses,
    allocated_cents: params.overview.totalAllocated,
    unallocated_cents: params.overview.unallocated,
    categories,
    transactions_included: params.includeTransactions,
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

function isOpenAIInsufficientQuotaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if (!("status" in error)) return false;
  const status = (error as any).status;
  if (status !== 429) return false;
  const code = (error as any).code;
  if (code === "insufficient_quota") return true;
  const message = typeof (error as any).message === "string" ? (error as any).message : "";
  return /insufficient quota|quota|billing|exceeded/i.test(message);
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
  outputJson?: unknown;
}): Promise<number> {
  try {
    return await getAIAnalysisRunRepository().create({
      userId: params.userId,
      analysisType: params.analysisType,
      month: params.month,
      promptTemplateId: params.promptTemplateId,
      promptVersion: params.promptVersion,
      inputJson: params.inputJson,
      inputText: params.inputText,
      outputText: params.outputText,
      outputJson: params.outputJson,
    });
  } catch (error) {
    if (isMissingDbObjectError(error)) {
      console.warn("AI analysis logging skipped: run `npm run db:push` to apply DB migrations.");
      return 0;
    }
    throw error;
  }
}

export class AIService {
  private async fetchBudgetExpenseAnalysisContext(month: string, userId: number): Promise<{
    overview: BudgetOverviewResult;
    incomeCents: number;
    expenseRows: ExpenseWithDetails[];
    prevMonthSpentByCategory: Record<number, number>;
  }> {
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
    return {
      overview,
      incomeCents: incomeResult.totals.overall,
      expenseRows: expenseResult.expenses,
      prevMonthSpentByCategory: priorExpenseResult.totals.byCategory,
    };
  }

  private async analyzeExpensesWithGemini(params: {
    month: string;
    userId: number;
    tier: AITier;
    providerLabel: AIProviderLabel;
    includeTransactions: boolean;
  }): Promise<AnalyzeExpensesOutcome> {
    const apiKey = getApiKeyForTier(params.tier);
    if (!apiKey) {
      return {
        success: false,
        error:
          params.tier === "paid"
            ? "Paid AI is not configured. Set GEMINI_PAID_API_KEY (or configure OPENAI_API_KEY for paid)."
            : "AI is not configured. Set GEMINI_FREE_API_KEY (or GEMINI_API_KEY).",
      };
    }

    const ctx = await this.fetchBudgetExpenseAnalysisContext(params.month, params.userId);
    const data = buildBudgetAnalysisModelPayload({
      month: params.month,
      overview: ctx.overview,
      incomeCents: ctx.incomeCents,
      expenseRows: ctx.expenseRows,
      prevMonthSpentByCategory: ctx.prevMonthSpentByCategory,
      includeTransactions: params.includeTransactions,
    });

    const systemPrompt = getBudgetAnalysisSystemPrompt();
    const userPrompt = buildBudgetAnalysisUserPrompt(data);
    const inputDebugText = `AI_PROVIDER: ${params.providerLabel}\n--- system ---\n${systemPrompt}\n\n--- user ---\n${userPrompt}`;

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: getModelForTier(params.tier),
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
      const runId = await persistAIAnalysisRun({
        userId: params.userId,
        analysisType: "expenses_monthly",
        month: params.month,
        promptTemplateId: "expenses_monthly",
        promptVersion: 4,
        inputJson: data,
        inputText: inputDebugText,
        outputText: analysisText,
        outputJson: report,
      });
      if (!runId) {
        return { success: false, error: "AI analysis was generated but could not be saved. Run `npm run db:push`." };
      }
      return { success: true, report, rawModelText: analysisText, inputText: inputDebugText, runId };
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI request failed.";
      return { success: false, error: message };
    }
  }

  private async analyzeExpensesWithOpenAI(params: {
    month: string;
    userId: number;
    includeTransactions: boolean;
  }): Promise<AnalyzeExpensesOutcome> {
    const apiKey = getOpenAIApiKey();
    if (!apiKey) {
      return { success: false, error: "Paid AI is not configured. Set OPENAI_API_KEY." };
    }

    const ctx = await this.fetchBudgetExpenseAnalysisContext(params.month, params.userId);
    const data = buildBudgetAnalysisModelPayload({
      month: params.month,
      overview: ctx.overview,
      incomeCents: ctx.incomeCents,
      expenseRows: ctx.expenseRows,
      prevMonthSpentByCategory: ctx.prevMonthSpentByCategory,
      includeTransactions: params.includeTransactions,
    });

    const systemPrompt = getBudgetAnalysisSystemPrompt();
    const userPrompt = buildBudgetAnalysisUserPrompt(data);
    const inputDebugText = `AI_PROVIDER: OpenAI (paid)\n--- system ---\n${systemPrompt}\n\n--- user ---\n${userPrompt}`;

    try {
      const client = new OpenAI({ apiKey });
      const resp = await client.chat.completions.create({
        model: getOpenAIModel(),
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      const text = resp.choices?.[0]?.message?.content ?? "";
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
      const runId = await persistAIAnalysisRun({
        userId: params.userId,
        analysisType: "expenses_monthly",
        month: params.month,
        promptTemplateId: "expenses_monthly",
        promptVersion: 4,
        inputJson: data,
        inputText: inputDebugText,
        outputText: analysisText,
        outputJson: report,
      });
      if (!runId) {
        return { success: false, error: "AI analysis was generated but could not be saved. Run `npm run db:push`." };
      }
      return { success: true, report, rawModelText: analysisText, inputText: inputDebugText, runId };
    } catch (err) {
      if (isOpenAIInsufficientQuotaError(err)) {
        // Fallback to the existing free Gemini configuration (explicit requirement).
        return await this.analyzeExpensesWithGemini({
          month: params.month,
          userId: params.userId,
          tier: "free",
          providerLabel: "Gemini (free fallback from OpenAI quota)",
          includeTransactions: params.includeTransactions,
        });
      }
      const message = err instanceof Error ? err.message : "AI request failed.";
      return { success: false, error: message };
    }
  }

  async analyzeExpenses(
    month: string,
    userId: number,
    tier: AITier = "free",
    includeTransactions = false
  ): Promise<AnalyzeExpensesOutcome> {
    if (tier === "paid" && getOpenAIApiKey()) {
      return await this.analyzeExpensesWithOpenAI({ month, userId, includeTransactions });
    }
    return await this.analyzeExpensesWithGemini({
      month,
      userId,
      tier,
      providerLabel: tier === "paid" ? "Gemini (paid)" : "Gemini (free)",
      includeTransactions,
    });
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
