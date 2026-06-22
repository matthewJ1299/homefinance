export type AIAnalysisRunApplicationActionType = "allocation_set" | "transfer";
export type AIAnalysisRunApplicationSuggestionKind = "allocation_change" | "recommended_move";

export interface CreateAIAnalysisRunApplicationInput {
  runId: number;
  userId: number;
  month: string;
  actionType: AIAnalysisRunApplicationActionType;
  categoryId?: number | null;
  fromCategoryId?: number | null;
  toCategoryId?: number | null;
  amountCents: number;
  previousAllocatedCents?: number | null;
  previousFromAllocatedCents?: number | null;
  previousToAllocatedCents?: number | null;
  suggestionKind: AIAnalysisRunApplicationSuggestionKind;
  suggestionIndex: number;
}

export interface AIAnalysisRunApplicationRow {
  id: number;
  runId: number;
  userId: number;
  month: string;
  actionType: AIAnalysisRunApplicationActionType;
  categoryId: number | null;
  fromCategoryId: number | null;
  toCategoryId: number | null;
  amountCents: number;
  previousAllocatedCents: number | null;
  previousFromAllocatedCents: number | null;
  previousToAllocatedCents: number | null;
  suggestionKind: AIAnalysisRunApplicationSuggestionKind;
  suggestionIndex: number;
  createdAt: string;
}

export interface IAIAnalysisRunApplicationRepository {
  insert(input: CreateAIAnalysisRunApplicationInput): Promise<number>;
  listByRun(userId: number, runId: number): Promise<AIAnalysisRunApplicationRow[]>;
}
