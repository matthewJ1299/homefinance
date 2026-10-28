export type AIAnalysisType = "expenses_monthly" | "goals_and_debt_monthly";

export interface CreateAIAnalysisRunInput {
  userId: number;
  analysisType: AIAnalysisType;
  month: string;
  promptTemplateId: string;
  promptVersion: number;
  inputJson: unknown;
  /** Backwards compatibility: optional rendered prompt text (for export/copy UX). */
  inputText?: string;
  outputText: string;
  /** Parsed output payload, when available. */
  outputJson?: unknown;
}

export interface AIAnalysisRunSummaryRow {
  id: number;
  month: string;
  createdAt: string;
}

export interface AIAnalysisRunDetailRow extends AIAnalysisRunSummaryRow {
  analysisType: AIAnalysisType;
  promptTemplateId: string;
  promptVersion: number;
  inputJson: unknown;
  inputText: string;
  outputText: string;
  outputJson: unknown;
}

export interface IAIAnalysisRunRepository {
  create(input: CreateAIAnalysisRunInput): Promise<number>;
  listExpenseMonthlyRuns(userId: number, limit?: number): Promise<AIAnalysisRunSummaryRow[]>;
  getRunForUser(userId: number, id: number): Promise<AIAnalysisRunDetailRow | null>;
  getLatestExpenseMonthlyRunForMonth(userId: number, month: string): Promise<AIAnalysisRunDetailRow | null>;
  /**
   * How many runs this user started in the last `windowMs`. Backs the AI rate
   * limit, which used to be a module-level Map -- per process, so two replicas
   * doubled the allowance and a deploy reset everyone's quota to zero.
   */
  countRunsSince(userId: number, windowMs: number): Promise<{ count: number; oldestAt: string | null }>;
}
