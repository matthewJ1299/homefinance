import { all, get, run, lastInsertId } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import type { GoalContribution, GoalContributionKind } from "@/lib/types";
import type {
  IGoalContributionRepository,
  CreateGoalContributionInput,
  GoalContributionTotals,
} from "../interfaces/goal-contribution.repository";

interface GoalContributionRow {
  id: number;
  goal_id: number;
  owner_user_id: number;
  account_transaction_id: number;
  kind: GoalContributionKind;
  amount: number;
  effective_date: string;
  note: string | null;
  created_at: string;
}

function toGoalContribution(row: GoalContributionRow): GoalContribution {
  return {
    id: row.id,
    goalId: row.goal_id,
    ownerUserId: row.owner_user_id,
    accountTransactionId: row.account_transaction_id,
    kind: row.kind,
    amount: row.amount,
    effectiveDate: row.effective_date,
    note: row.note,
    createdAt: row.created_at,
  };
}

function emptyTotals(): GoalContributionTotals {
  return { totalContributed: 0, totalWithdrawn: 0, totalPaid: 0, totalInterest: 0 };
}

function toTotals(row: Record<string, unknown> | null): GoalContributionTotals {
  if (!row) return emptyTotals();
  return {
    totalContributed: Number(row.total_contributed ?? 0),
    totalWithdrawn: Number(row.total_withdrawn ?? 0),
    totalPaid: Number(row.total_paid ?? 0),
    totalInterest: Number(row.total_interest ?? 0),
  };
}

export class GoalContributionRepository implements IGoalContributionRepository {
  async create(input: CreateGoalContributionInput): Promise<{ id: number }> {
    const hid = requireHouseholdId();
    await run(
      "INSERT INTO goal_contributions (goal_id, owner_user_id, account_transaction_id, kind, amount, effective_date, note, household_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        input.goalId,
        input.ownerUserId,
        input.accountTransactionId,
        input.kind,
        input.amount,
        input.effectiveDate,
        input.note ?? null,
        hid,
      ]
    );
    return { id: await lastInsertId() };
  }

  async findByGoal(
    goalId: number,
    ownerUserId: number,
    limit: number,
    offset: number
  ): Promise<GoalContribution[]> {
    const hid = requireHouseholdId();
    const rows = await all<GoalContributionRow>(
      "SELECT id, goal_id, owner_user_id, account_transaction_id, kind, amount, effective_date, note, created_at FROM goal_contributions WHERE goal_id = ? AND owner_user_id = ? AND household_id = ? ORDER BY effective_date DESC, created_at DESC LIMIT ? OFFSET ?",
      [goalId, ownerUserId, hid, limit, offset]
    );
    return rows.map(toGoalContribution);
  }

  async findByGoalChronologicalAsc(
    goalId: number,
    ownerUserId: number
  ): Promise<GoalContribution[]> {
    const hid = requireHouseholdId();
    const rows = await all<GoalContributionRow>(
      "SELECT id, goal_id, owner_user_id, account_transaction_id, kind, amount, effective_date, note, created_at FROM goal_contributions WHERE goal_id = ? AND owner_user_id = ? AND household_id = ? ORDER BY effective_date ASC, created_at ASC",
      [goalId, ownerUserId, hid]
    );
    return rows.map(toGoalContribution);
  }

  async countByGoal(goalId: number, ownerUserId: number): Promise<number> {
    const hid = requireHouseholdId();
    const row = await get<{ c: number }>(
      "SELECT COUNT(*) AS c FROM goal_contributions WHERE goal_id = ? AND owner_user_id = ? AND household_id = ?",
      [goalId, ownerUserId, hid]
    );
    return row?.c ?? 0;
  }

  async totalsByGoal(goalId: number, ownerUserId: number): Promise<GoalContributionTotals> {
    const hid = requireHouseholdId();
    const row = await get(
      `SELECT
        COALESCE(SUM(CASE WHEN kind = 'contribution' THEN amount ELSE 0 END), 0) AS total_contributed,
        COALESCE(SUM(CASE WHEN kind = 'withdrawal' THEN amount ELSE 0 END), 0) AS total_withdrawn,
        COALESCE(SUM(CASE WHEN kind = 'payment' THEN amount ELSE 0 END), 0) AS total_paid,
        COALESCE(SUM(CASE WHEN kind = 'interest' THEN amount ELSE 0 END), 0) AS total_interest
      FROM goal_contributions
      WHERE goal_id = ? AND owner_user_id = ? AND household_id = ?`,
      [goalId, ownerUserId, hid]
    );
    return toTotals(row as Record<string, unknown> | null);
  }

  async totalsByGoalForMonth(
    goalId: number,
    ownerUserId: number,
    month: string
  ): Promise<GoalContributionTotals> {
    const hid = requireHouseholdId();
    const row = await get(
      `SELECT
        COALESCE(SUM(CASE WHEN kind = 'contribution' THEN amount ELSE 0 END), 0) AS total_contributed,
        COALESCE(SUM(CASE WHEN kind = 'withdrawal' THEN amount ELSE 0 END), 0) AS total_withdrawn,
        COALESCE(SUM(CASE WHEN kind = 'payment' THEN amount ELSE 0 END), 0) AS total_paid,
        COALESCE(SUM(CASE WHEN kind = 'interest' THEN amount ELSE 0 END), 0) AS total_interest
      FROM goal_contributions
      WHERE goal_id = ? AND owner_user_id = ? AND household_id = ?
        AND to_char(effective_date, 'YYYY-MM') = ?`,
      [goalId, ownerUserId, hid, month]
    );
    return toTotals(row as Record<string, unknown> | null);
  }
}
