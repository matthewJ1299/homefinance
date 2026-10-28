import { all, get } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import type {
  CreateAIAnalysisRunInput,
  AIAnalysisRunDetailRow,
  AIAnalysisRunSummaryRow,
  IAIAnalysisRunRepository,
} from "../interfaces/ai-analysis-run.repository";

export class AIAnalysisRunRepository implements IAIAnalysisRunRepository {
  async create(input: CreateAIAnalysisRunInput): Promise<number> {
    const hid = requireHouseholdId();
    const row = await get<{ id: string | number }>(
      "INSERT INTO ai_analysis_runs (user_id, household_id, analysis_type, month, prompt_template_id, prompt_version, input_json, input_text, output_text, output_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id",
      [
        input.userId,
        hid,
        input.analysisType,
        input.month,
        input.promptTemplateId,
        input.promptVersion,
        JSON.stringify(input.inputJson ?? {}),
        input.inputText ?? "",
        input.outputText,
        JSON.stringify(input.outputJson ?? {}),
      ]
    );
    const id = row?.id;
    return typeof id === "string" ? Number(id) : Number(id ?? 0);
  }

  async countRunsSince(
    userId: number,
    windowMs: number
  ): Promise<{ count: number; oldestAt: string | null }> {
    const hid = requireHouseholdId();
    const seconds = Math.max(1, Math.round(windowMs / 1000));
    // NOW() rather than a client timestamp: the window must not move when the
    // app server's clock drifts from the database's.
    const row = await get<{ c: string | number; oldest: string | null }>(
      `SELECT COUNT(*) AS c, MIN(created_at) AS oldest
         FROM ai_analysis_runs
        WHERE household_id = ? AND user_id = ?
          AND created_at > NOW() - (? * INTERVAL '1 second')`,
      [hid, userId, seconds]
    );
    return { count: Number(row?.c ?? 0), oldestAt: row?.oldest ?? null };
  }

  async listExpenseMonthlyRuns(userId: number, limit = 50): Promise<AIAnalysisRunSummaryRow[]> {
    const hid = requireHouseholdId();
    const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)));
    const rows = await all<{ id: string | number; month: string; created_at: string }>(
      "SELECT id, month, created_at FROM ai_analysis_runs WHERE household_id = ? AND user_id = ? AND analysis_type = 'expenses_monthly' ORDER BY created_at DESC LIMIT ?",
      [hid, userId, safeLimit]
    );
    return rows.map((r) => ({
      id: typeof r.id === "string" ? Number(r.id) : Number(r.id),
      month: r.month,
      createdAt: r.created_at,
    }));
  }

  async getRunForUser(userId: number, id: number): Promise<AIAnalysisRunDetailRow | null> {
    const hid = requireHouseholdId();
    const row = await get<{
      id: string | number;
      analysis_type: string;
      month: string;
      prompt_template_id: string;
      prompt_version: number;
      input_json: unknown;
      input_text: string;
      output_text: string;
      output_json: unknown;
      created_at: string;
    }>(
      "SELECT id, analysis_type, month, prompt_template_id, prompt_version, input_json, input_text, output_text, output_json, created_at FROM ai_analysis_runs WHERE household_id = ? AND user_id = ? AND id = ?",
      [hid, userId, id]
    );
    if (!row) return null;
    return {
      id: typeof row.id === "string" ? Number(row.id) : Number(row.id),
      analysisType: row.analysis_type as AIAnalysisRunDetailRow["analysisType"],
      month: row.month,
      promptTemplateId: row.prompt_template_id,
      promptVersion: row.prompt_version,
      inputJson: row.input_json,
      inputText: row.input_text,
      outputText: row.output_text,
      outputJson: row.output_json,
      createdAt: row.created_at,
    };
  }

  async getLatestExpenseMonthlyRunForMonth(userId: number, month: string): Promise<AIAnalysisRunDetailRow | null> {
    const hid = requireHouseholdId();
    const row = await get<{
      id: string | number;
      analysis_type: string;
      month: string;
      prompt_template_id: string;
      prompt_version: number;
      input_json: unknown;
      input_text: string;
      output_text: string;
      output_json: unknown;
      created_at: string;
    }>(
      "SELECT id, analysis_type, month, prompt_template_id, prompt_version, input_json, input_text, output_text, output_json, created_at FROM ai_analysis_runs WHERE household_id = ? AND user_id = ? AND analysis_type = 'expenses_monthly' AND month = ? ORDER BY created_at DESC LIMIT 1",
      [hid, userId, month]
    );
    if (!row) return null;
    return {
      id: typeof row.id === "string" ? Number(row.id) : Number(row.id),
      analysisType: row.analysis_type as AIAnalysisRunDetailRow["analysisType"],
      month: row.month,
      promptTemplateId: row.prompt_template_id,
      promptVersion: row.prompt_version,
      inputJson: row.input_json,
      inputText: row.input_text,
      outputText: row.output_text,
      outputJson: row.output_json,
      createdAt: row.created_at,
    };
  }
}
