import { all, get, run, lastInsertId } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import type { RecurringIncome } from "@/lib/types";
import type { IRecurringIncomeRepository } from "../interfaces/recurring-income.repository";

interface Row {
  id: number;
  user_id: number;
  amount: number;
  type: string;
  description: string | null;
  day_of_month: number;
}

function toRecurringIncome(r: Row): RecurringIncome {
  return {
    id: r.id,
    userId: r.user_id,
    amount: r.amount,
    type: r.type as "salary" | "ad_hoc",
    description: r.description,
    dayOfMonth: r.day_of_month,
  };
}

export class RecurringIncomeRepository implements IRecurringIncomeRepository {
  async findAll(): Promise<RecurringIncome[]> {
    const hid = requireHouseholdId();
    const rows = await all<Row>(
      "SELECT id, user_id, amount, type, description, day_of_month FROM recurring_income WHERE household_id = ? ORDER BY user_id, id",
      [hid]
    );
    return rows.map(toRecurringIncome);
  }

  async findByUserId(userId: number): Promise<RecurringIncome[]> {
    const hid = requireHouseholdId();
    const rows = await all<Row>(
      "SELECT id, user_id, amount, type, description, day_of_month FROM recurring_income WHERE user_id = ? AND household_id = ? ORDER BY id",
      [userId, hid]
    );
    return rows.map(toRecurringIncome);
  }

  async findById(id: number): Promise<RecurringIncome | null> {
    const hid = requireHouseholdId();
    const row = await get<Row>(
      "SELECT id, user_id, amount, type, description, day_of_month FROM recurring_income WHERE id = ? AND household_id = ?",
      [id, hid]
    );
    return row ? toRecurringIncome(row) : null;
  }

  async create(data: {
    userId: number;
    amount: number;
    type: "salary" | "ad_hoc";
    description?: string | null;
    dayOfMonth: number;
  }): Promise<RecurringIncome> {
    const hid = requireHouseholdId();
    await run(
      "INSERT INTO recurring_income (user_id, household_id, amount, type, description, day_of_month) VALUES (?, ?, ?, ?, ?, ?)",
      [
        data.userId,
        hid,
        data.amount,
        data.type,
        data.description ?? null,
        Math.min(31, Math.max(1, data.dayOfMonth)),
      ]
    );
    const id = await lastInsertId();
    const row = (await get<Row>(
      "SELECT id, user_id, amount, type, description, day_of_month FROM recurring_income WHERE id = ? AND household_id = ?",
      [id, hid]
    ))!;
    return toRecurringIncome(row);
  }

  async update(
    id: number,
    data: {
      amount?: number;
      type?: "salary" | "ad_hoc";
      description?: string | null;
      dayOfMonth?: number;
    }
  ): Promise<void> {
    const updates: string[] = [];
    const params: (string | number | null)[] = [];
    if (data.amount != null) {
      updates.push("amount = ?");
      params.push(data.amount);
    }
    if (data.type != null) {
      updates.push("type = ?");
      params.push(data.type);
    }
    if (data.description !== undefined) {
      updates.push("description = ?");
      params.push(data.description);
    }
    if (data.dayOfMonth != null) {
      updates.push("day_of_month = ?");
      params.push(Math.min(31, Math.max(1, data.dayOfMonth)));
    }
    if (updates.length === 0) return;
    const hid = requireHouseholdId();
    params.push(id, hid);
    await run(`UPDATE recurring_income SET ${updates.join(", ")} WHERE id = ? AND household_id = ?`, params);
  }

  async delete(id: number): Promise<void> {
    const hid = requireHouseholdId();
    await run("DELETE FROM recurring_income WHERE id = ? AND household_id = ?", [id, hid]);
  }
}
