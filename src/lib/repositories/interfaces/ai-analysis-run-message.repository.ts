export type AIAnalysisRunMessageRole = "user" | "assistant";

export interface AIAnalysisRunMessageRow {
  id: number;
  runId: number;
  userId: number;
  role: AIAnalysisRunMessageRole;
  content: string;
  createdAt: string;
}

export interface IAIAnalysisRunMessageRepository {
  listByRun(userId: number, runId: number): Promise<AIAnalysisRunMessageRow[]>;
  insertMessage(
    userId: number,
    runId: number,
    role: AIAnalysisRunMessageRole,
    content: string
  ): Promise<number>;
  runBelongsToUser(userId: number, runId: number): Promise<boolean>;
}
