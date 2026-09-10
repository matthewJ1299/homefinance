import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { BudgetService, type BudgetOverviewResult } from "@/lib/services/budget.service";
import { ExpenseService } from "@/lib/services/expense.service";
import { IncomeService } from "@/lib/services/income.service";
import { formatRand } from "@/lib/utils/currency";
import { prevMonth } from "@/lib/utils/date";
import { getAIAnalysisRunMessageRepository, getAIAnalysisRunRepository } from "@/lib/repositories";
import type { AIAnalysisType } from "@/lib/repositories/interfaces/ai-analysis-run.repository";
import type { ExpenseWithDetails } from "@/lib/types";
import type { BudgetAnalysisModelPayload, BudgetAnalysisReport } from "@/lib/types/budget-ai-report";
import { buildBudgetAnalysisUserPrompt, getBudgetAnalysisSystemPrompt } from "@/lib/services/ai/budget-analysis-prompts";
import {
  buildBudgetAnalysisFollowUpUserPrompt,
  getBudgetAnalysisFollowUpSystemPrompt,
} from "@/lib/services/ai/budget-analysis-followup-prompts";
import { parseBudgetAnalysisReportFromModelText } from "@/lib/services/ai/parse-budget-analysis-response";
import { normalizeBudgetAnalysisReport } from "@/lib/utils/normalize-budget-analysis-report";

export type AITier = "free" | "paid";

const DEFAULT_FREE_MODEL = "gemini-2.5-flash";
const DEFAULT_PAID_MODEL = "gemini-2.5-flash";
const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";

type AIProviderLabel =
  | "OpenAI (paid)"
  | "Gemini (paid)"
  | "Gemini (free)"
  | "Gemini (free fallback from OpenAI quota)";

interface AnalyzeExpensesRequest {
  includeTransactions: boolean;
  budgetContext?: string;
}

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

function normalizeBudgetContext(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, 1000);
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

export interface ReplyToBudgetReportResult {
  success: true;
  reply: string;
  userMessageId: number;
  assistantMessageId: number;
}

export interface ReplyToBudgetReportError {
  success: false;
  error: string;
  userMessageId?: number;
}

export type ReplyToBudgetReportOutcome = ReplyToBudgetReportResult | ReplyToBudgetReportError;

function normalizeFollowUpMessage(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, 2000);
}

function buildBudgetAnalysisModelPayload(params: {
  month: string;
  overview: BudgetOverviewResult;
  incomeCents: number;
  expenseRows: ExpenseWithDetails[];
  prevMonthSpentByCategory: Record<number, number>;
  includeTransactions: boolean;
}): BudgetAnalysisModelPayload {
  const categories = params.overview.categories
    .filter((c) => c.assigned > 0 || c.carriedIn !== 0 || c.spent > 0)
    .map((c) => ({
      name: c.categoryName,
      assigned_cents: c.assigned,
      carried_in_cents: c.carriedIn,
      spent_cents: c.spent,
      available_cents: c.available,
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
    assigned_cents: params.overview.totalAssigned,
    unassigned_cents: params.overview.unassigned,
    // Leftovers stay in the category and overspends come off next month's
    // unassigned, so state both or the model reasons about the old model.
    envelope_left_cents: params.overview.envelopeLeft,
    overspent_cents: params.overview.overspentTotal,
    carried_overspend_cents: params.overview.carriedOverspend,
    categories,
    transactions_included: params.includeTransactions,
    transactions,
  };
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
    budgetContext?: string;
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
    const userPrompt = buildBudgetAnalysisUserPrompt(data, params.budgetContext);
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
        promptVersion: 6,
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
    budgetContext?: string;
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
    const userPrompt = buildBudgetAnalysisUserPrompt(data, params.budgetContext);
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
        promptVersion: 6,
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
          budgetContext: params.budgetContext,
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
    request: AnalyzeExpensesRequest = { includeTransactions: false }
  ): Promise<AnalyzeExpensesOutcome> {
    const normalizedRequest: AnalyzeExpensesRequest = {
      includeTransactions: request.includeTransactions === true,
      budgetContext: normalizeBudgetContext(request.budgetContext),
    };
    if (tier === "paid" && getOpenAIApiKey()) {
      return await this.analyzeExpensesWithOpenAI({
        month,
        userId,
        includeTransactions: normalizedRequest.includeTransactions,
        budgetContext: normalizedRequest.budgetContext,
      });
    }
    return await this.analyzeExpensesWithGemini({
      month,
      userId,
      tier,
      providerLabel: tier === "paid" ? "Gemini (paid)" : "Gemini (free)",
      includeTransactions: normalizedRequest.includeTransactions,
      budgetContext: normalizedRequest.budgetContext,
    });
  }


  async replyToBudgetReport(
    runId: number,
    userId: number,
    message: string,
    tier: AITier = "free"
  ): Promise<ReplyToBudgetReportOutcome> {
    const trimmed = normalizeFollowUpMessage(message);
    if (!trimmed) {
      return { success: false, error: "Enter a message." };
    }

    const runRepo = getAIAnalysisRunRepository();
    const messageRepo = getAIAnalysisRunMessageRepository();
    const run = await runRepo.getRunForUser(userId, runId);
    if (!run || run.analysisType !== "expenses_monthly") {
      return { success: false, error: "Report not found." };
    }

    const report = normalizeBudgetAnalysisReport(run.outputJson);
    if (!report) {
      return { success: false, error: "Report data is invalid." };
    }

    let userMessageId: number;
    try {
      userMessageId = await messageRepo.insertMessage(userId, runId, "user", trimmed);
    } catch (err) {
      if (isMissingDbObjectError(err)) {
        return { success: false, error: "Chat is not available. Run `npm run db:push`." };
      }
      throw err;
    }

    const priorMessages = await messageRepo.listByRun(userId, runId);
    const systemPrompt = getBudgetAnalysisFollowUpSystemPrompt();
    const userPrompt = buildBudgetAnalysisFollowUpUserPrompt({
      month: run.month,
      inputJson: run.inputJson,
      report,
      priorMessages: priorMessages.filter((m) => m.id !== userMessageId),
      userMessage: trimmed,
    });

    const callGemini = async (apiTier: AITier): Promise<string | null> => {
      const apiKey = getApiKeyForTier(apiTier);
      if (!apiKey) return null;
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: getModelForTier(apiTier),
        systemInstruction: systemPrompt,
        generationConfig: { temperature: 0.5 },
      });
      const result = await model.generateContent(userPrompt);
      const text = result.response?.text()?.trim();
      return text || null;
    };

    const callOpenAI = async (): Promise<string | null> => {
      const apiKey = getOpenAIApiKey();
      if (!apiKey) return null;
      const client = new OpenAI({ apiKey });
      const resp = await client.chat.completions.create({
        model: getOpenAIModel(),
        temperature: 0.5,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      const text = resp.choices?.[0]?.message?.content?.trim();
      return text || null;
    };

    try {
      let reply: string | null = null;
      if (tier === "paid" && getOpenAIApiKey()) {
        try {
          reply = await callOpenAI();
        } catch (err) {
          if (!isOpenAIInsufficientQuotaError(err)) throw err;
          reply = await callGemini("free");
        }
      } else {
        reply = await callGemini(tier === "paid" ? "paid" : "free");
      }

      if (!reply) {
        return {
          success: false,
          error: "No reply was returned.",
          userMessageId,
        };
      }

      const assistantMessageId = await messageRepo.insertMessage(userId, runId, "assistant", reply);
      return { success: true, reply, userMessageId, assistantMessageId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI request failed.";
      return { success: false, error: msg, userMessageId };
    }
  }
}
