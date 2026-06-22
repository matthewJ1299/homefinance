import { all, get } from "@/lib/db";
import type {
  AIAnalysisRunMessageRow,
  AIAnalysisRunMessageRole,
  IAIAnalysisRunMessageRepository,
} from "../interfaces/ai-analysis-run-message.repository";

export class AIAnalysisRunMessageRepository implements IAIAnalysisRunMessageRepository {
  async listByRun(userId: number, runId: number): Promise<AIAnalysisRunMessageRow[]> {
    const rows = await all<{
      id: string | number;
      run_id: string | number;
      user_id: number;
      role: string;
      content: string;
      created_at: string;
    }>(
      "SELECT id, run_id, user_id, role, content, created_at FROM ai_analysis_run_messages WHERE user_id = ? AND run_id = ? ORDER BY created_at ASC",
      [userId, runId]
    );
    return rows.map((r) => ({
      id: Number(r.id),
      runId: Number(r.run_id),
      userId: r.user_id,
      role: r.role as AIAnalysisRunMessageRole,
      content: r.content,
      createdAt: r.created_at,
    }));
  }

  async insertMessage(
    userId: number,
    runId: number,
    role: AIAnalysisRunMessageRole,
    content: string
  ): Promise<number> {
    const row = await get<{ id: string | number }>(
      "INSERT INTO ai_analysis_run_messages (run_id, user_id, role, content) VALUES (?, ?, ?, ?) RETURNING id",
      [runId, userId, role, content]
    );
    return Number(row?.id ?? 0);
  }

  async runBelongsToUser(userId: number, runId: number): Promise<boolean> {
    const row = await get<{ id: string | number }>(
      "SELECT id FROM ai_analysis_runs WHERE user_id = ? AND id = ?",
      [userId, runId]
    );
    return row != null;
  }
}
