import { all, get, run, lastInsertId } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import type { Goal, GoalStrategy, GoalType } from "@/lib/types";
import type {
  IGoalRepository,
  CreateGoalInput,
  UpdateGoalInput,
} from "../interfaces/goal.repository";

interface GoalRow {
  id: number;
  owner_user_id: number;
  name: string;
  type: GoalType;
  target_amount: number | null;
  monthly_target: number;
  linked_account_id: number | null;
  apr: string | number | null;
  strategy: GoalStrategy | null;
  archived_at: string | null;
  created_at: string;
}

function toGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    type: row.type,
    targetAmount: row.target_amount,
    monthlyTarget: row.monthly_target,
    linkedAccountId: row.linked_account_id,
    apr: row.apr == null ? null : Number(row.apr),
    strategy: row.strategy,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  };
}

export class GoalRepository implements IGoalRepository {
  async findById(id: number, ownerUserId: number): Promise<Goal | null> {
    const hid = requireHouseholdId();
    const row = await get<GoalRow>(
      "SELECT id, owner_user_id, name, type, target_amount, monthly_target, linked_account_id, apr, strategy, archived_at, created_at FROM goals WHERE id = ? AND owner_user_id = ? AND household_id = ?",
      [id, ownerUserId, hid]
    );
    return row ? toGoal(row) : null;
  }

  async findAllForUser(ownerUserId: number, includeArchived = false): Promise<Goal[]> {
    const hid = requireHouseholdId();
    const whereArchived = includeArchived ? "" : " AND archived_at IS NULL";
    const rows = await all<GoalRow>(
      `SELECT id, owner_user_id, name, type, target_amount, monthly_target, linked_account_id, apr, strategy, archived_at, created_at
       FROM goals
       WHERE owner_user_id = ? AND household_id = ?${whereArchived}
       ORDER BY created_at DESC`,
      [ownerUserId, hid]
    );
    return rows.map(toGoal);
  }

  async create(ownerUserId: number, data: CreateGoalInput): Promise<{ id: number }> {
    const hid = requireHouseholdId();
    await run(
      "INSERT INTO goals (owner_user_id, household_id, name, type, target_amount, monthly_target, linked_account_id, apr, strategy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        ownerUserId,
        hid,
        data.name,
        data.type,
        data.targetAmount ?? null,
        data.monthlyTarget,
        data.linkedAccountId ?? null,
        data.apr ?? null,
        data.strategy ?? null,
      ]
    );
    return { id: await lastInsertId() };
  }

  async update(id: number, ownerUserId: number, data: UpdateGoalInput): Promise<void> {
    const updates: string[] = [];
    const params: (string | number | boolean | null)[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      params.push(data.name);
    }
    if (data.targetAmount !== undefined) {
      updates.push("target_amount = ?");
      params.push(data.targetAmount);
    }
    if (data.monthlyTarget !== undefined) {
      updates.push("monthly_target = ?");
      params.push(data.monthlyTarget);
    }
    if (data.linkedAccountId !== undefined) {
      updates.push("linked_account_id = ?");
      params.push(data.linkedAccountId);
    }
    if (data.apr !== undefined) {
      updates.push("apr = ?");
      params.push(data.apr);
    }
    if (data.strategy !== undefined) {
      updates.push("strategy = ?");
      params.push(data.strategy);
    }
    if (data.archivedAt !== undefined) {
      updates.push("archived_at = ?");
      params.push(data.archivedAt);
    }

    if (updates.length === 0) return;
    const hid = requireHouseholdId();
    params.push(id, ownerUserId, hid);
    await run(
      `UPDATE goals SET ${updates.join(", ")} WHERE id = ? AND owner_user_id = ? AND household_id = ?`,
      params
    );
  }

  async delete(id: number, ownerUserId: number): Promise<void> {
    const hid = requireHouseholdId();
    await run("DELETE FROM goals WHERE id = ? AND owner_user_id = ? AND household_id = ?", [
      id,
      ownerUserId,
      hid,
    ]);
  }
}
