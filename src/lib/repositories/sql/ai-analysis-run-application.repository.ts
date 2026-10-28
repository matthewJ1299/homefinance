import { all, get } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import type {
  AIAnalysisRunApplicationRow,
  CreateAIAnalysisRunApplicationInput,
  IAIAnalysisRunApplicationRepository,
} from "../interfaces/ai-analysis-run-application.repository";

export class AIAnalysisRunApplicationRepository implements IAIAnalysisRunApplicationRepository {
  async insert(input: CreateAIAnalysisRunApplicationInput): Promise<number> {
    const row = await get<{ id: string | number }>(
      `INSERT INTO ai_analysis_run_applications (
        run_id, user_id, month, action_type, category_id, from_category_id, to_category_id,
        amount_cents, previous_allocated_cents, previous_from_allocated_cents, previous_to_allocated_cents,
        suggestion_kind, suggestion_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        input.runId,
        input.userId,
        input.month,
        input.actionType,
        input.categoryId ?? null,
        input.fromCategoryId ?? null,
        input.toCategoryId ?? null,
        input.amountCents,
        input.previousAllocatedCents ?? null,
        input.previousFromAllocatedCents ?? null,
        input.previousToAllocatedCents ?? null,
        input.suggestionKind,
        input.suggestionIndex,
      ]
    );
    return Number(row?.id ?? 0);
  }

  async listByRun(userId: number, runId: number): Promise<AIAnalysisRunApplicationRow[]> {
    const rows = await all<{
      id: string | number;
      run_id: string | number;
      user_id: number;
      month: string;
      action_type: string;
      category_id: number | null;
      from_category_id: number | null;
      to_category_id: number | null;
      amount_cents: number;
      previous_allocated_cents: number | null;
      previous_from_allocated_cents: number | null;
      previous_to_allocated_cents: number | null;
      suggestion_kind: string;
      suggestion_index: number;
      created_at: string;
    }>(
      `SELECT a.id, a.run_id, a.user_id, a.month, a.action_type, a.category_id, a.from_category_id, a.to_category_id,
        a.amount_cents, a.previous_allocated_cents, a.previous_from_allocated_cents, a.previous_to_allocated_cents,
        a.suggestion_kind, a.suggestion_index, a.created_at
       FROM ai_analysis_run_applications a
       INNER JOIN ai_analysis_runs ar ON ar.id = a.run_id
       WHERE ar.household_id = ? AND a.user_id = ? AND a.run_id = ?
       ORDER BY a.created_at ASC`,
      [requireHouseholdId(), userId, runId]
    );
    return rows.map((r) => ({
      id: Number(r.id),
      runId: Number(r.run_id),
      userId: r.user_id,
      month: r.month,
      actionType: r.action_type as AIAnalysisRunApplicationRow["actionType"],
      categoryId: r.category_id,
      fromCategoryId: r.from_category_id,
      toCategoryId: r.to_category_id,
      amountCents: r.amount_cents,
      previousAllocatedCents: r.previous_allocated_cents,
      previousFromAllocatedCents: r.previous_from_allocated_cents,
      previousToAllocatedCents: r.previous_to_allocated_cents,
      suggestionKind: r.suggestion_kind as AIAnalysisRunApplicationRow["suggestionKind"],
      suggestionIndex: r.suggestion_index,
      createdAt: r.created_at,
    }));
  }
}
