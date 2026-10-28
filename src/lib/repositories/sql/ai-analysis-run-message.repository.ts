import { all, get } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import type {
  AIAnalysisRunMessageRow,
  AIAnalysisRunMessageRole,
  IAIAnalysisRunMessageRepository,
} from "../interfaces/ai-analysis-run-message.repository";

export class AIAnalysisRunMessageRepository implements IAIAnalysisRunMessageRepository {
  async listByRun(userId: number, runId: number): Promise<AIAnalysisRunMessageRow[]> {
    const hid = requireHouseholdId();
    const rows = await all<{
      id: string | number;
      run_id: string | number;
      user_id: number;
      role: string;
      content: string;
      created_at: string;
    }>(
      `SELECT m.id, m.run_id, m.user_id, m.role, m.content, m.created_at
       FROM ai_analysis_run_messages m
       INNER JOIN ai_analysis_runs ar ON ar.id = m.run_id
       WHERE ar.household_id = ? AND m.user_id = ? AND m.run_id = ?
       ORDER BY m.created_at ASC`,
      [hid, userId, runId]
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
    const hid = requireHouseholdId();
    const row = await get<{ id: string | number }>(
      "SELECT id FROM ai_analysis_runs WHERE user_id = ? AND id = ? AND household_id = ?",
      [userId, runId, hid]
    );
    return row != null;
  }
}
