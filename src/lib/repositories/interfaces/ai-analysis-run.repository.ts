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
}

export interface IAIAnalysisRunRepository {
  create(input: CreateAIAnalysisRunInput): Promise<void>;
}
