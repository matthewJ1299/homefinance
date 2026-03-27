import { all, get, run, lastInsertId } from "@/lib/db";
import type { RecurringExpense } from "@/lib/types";
import type { IRecurringExpenseRepository } from "../interfaces/recurring-expense.repository";

interface Row {
  id: number;
  user_id: number;
  category_id: number;
  amount: number;
  note: string | null;
  day_of_month: number;
}

function toRecurringExpense(r: Row): RecurringExpense {
  return {
    id: r.id,
    userId: r.user_id,
    categoryId: r.category_id,
    amount: r.amount,
    note: r.note,
    dayOfMonth: r.day_of_month,
  };
}

export class RecurringExpenseRepository implements IRecurringExpenseRepository {
  async findAll(): Promise<RecurringExpense[]> {
    const rows = await all<Row>(
      "SELECT id, user_id, category_id, amount, note, day_of_month FROM recurring_expenses ORDER BY user_id, id"
    );
    return rows.map(toRecurringExpense);
  }

  async findByUserId(userId: number): Promise<RecurringExpense[]> {
    const rows = await all<Row>(
      "SELECT id, user_id, category_id, amount, note, day_of_month FROM recurring_expenses WHERE user_id = ? ORDER BY id",
      [userId]
    );
    return rows.map(toRecurringExpense);
  }

  async findById(id: number): Promise<RecurringExpense | null> {
    const row = await get<Row>(
      "SELECT id, user_id, category_id, amount, note, day_of_month FROM recurring_expenses WHERE id = ?",
      [id]
    );
    return row ? toRecurringExpense(row) : null;
  }

  async create(data: {
    userId: number;
    categoryId: number;
    amount: number;
    note?: string | null;
    dayOfMonth: number;
  }): Promise<RecurringExpense> {
    await run(
      "INSERT INTO recurring_expenses (user_id, category_id, amount, note, day_of_month) VALUES (?, ?, ?, ?, ?)",
      [
        data.userId,
        data.categoryId,
        data.amount,
        data.note ?? null,
        Math.min(31, Math.max(1, data.dayOfMonth)),
      ]
    );
    const id = await lastInsertId();
    const row = (await get<Row>(
      "SELECT id, user_id, category_id, amount, note, day_of_month FROM recurring_expenses WHERE id = ?",
      [id]
    ))!;
    return toRecurringExpense(row);
  }

  async update(
    id: number,
    data: {
      categoryId?: number;
      amount?: number;
      note?: string | null;
      dayOfMonth?: number;
    }
  ): Promise<void> {
    const updates: string[] = [];
    const params: (string | number | null)[] = [];
    if (data.categoryId != null) {
      updates.push("category_id = ?");
      params.push(data.categoryId);
    }
    if (data.amount != null) {
      updates.push("amount = ?");
      params.push(data.amount);
    }
    if (data.note !== undefined) {
      updates.push("note = ?");
      params.push(data.note);
    }
    if (data.dayOfMonth != null) {
      updates.push("day_of_month = ?");
      params.push(Math.min(31, Math.max(1, data.dayOfMonth)));
    }
    if (updates.length === 0) return;
    params.push(id);
    await run(`UPDATE recurring_expenses SET ${updates.join(", ")} WHERE id = ?`, params);
  }

  async delete(id: number): Promise<void> {
    await run("DELETE FROM recurring_expenses WHERE id = ?", [id]);
  }
}
