import { all, get, run, lastInsertId } from "@/lib/db";
import type { ExpenseWithDetails } from "@/lib/types";
import type {
  IExpenseRepository,
  CreateExpenseInput,
  UpdateExpenseInput,
} from "../interfaces/expense.repository";

const SELECT_EXPENSE_DETAILS = `
  SELECT e.id, e.user_id AS userId, u.name AS userName, e.category_id AS categoryId, c.name AS categoryName,
         e.amount, e.note, e.date, e.created_at AS createdAt, e.split_group_id AS splitGroupId, e.paid_by_user_id AS paidByUserId
  FROM expenses e
  INNER JOIN users u ON e.user_id = u.id
  INNER JOIN categories c ON e.category_id = c.id
`;

interface ExpenseDetailsRow {
  id: number;
  userId: number;
  userName: string;
  categoryId: number;
  categoryName: string;
  amount: number;
  note: string | null;
  date: string;
  createdAt: string;
  splitGroupId: string | null;
  paidByUserId: number | null;
}

function toExpenseWithDetails(r: ExpenseDetailsRow): ExpenseWithDetails {
  return {
    id: r.id,
    userId: r.userId,
    userName: r.userName,
    categoryId: r.categoryId,
    categoryName: r.categoryName,
    amount: r.amount,
    note: r.note,
    date: r.date,
    createdAt: r.createdAt,
    splitGroupId: r.splitGroupId,
    paidByUserId: r.paidByUserId,
  };
}

export class ExpenseRepository implements IExpenseRepository {
  async findByMonth(month: string, userId?: number): Promise<ExpenseWithDetails[]> {
    const sql = userId != null
      ? `${SELECT_EXPENSE_DETAILS} WHERE e.month = ? AND e.user_id = ? ORDER BY e.date, e.created_at`
      : `${SELECT_EXPENSE_DETAILS} WHERE e.month = ? ORDER BY e.date, e.created_at`;
    const params = userId != null ? [month, userId] : [month];
    const rows = all<ExpenseDetailsRow>(sql, params);
    return rows.map(toExpenseWithDetails);
  }

  async findByMonthPaginated(
    month: string,
    limit: number,
    offset: number,
    userId?: number
  ): Promise<ExpenseWithDetails[]> {
    const base = userId != null
      ? `${SELECT_EXPENSE_DETAILS} WHERE e.month = ? AND e.user_id = ?`
      : `${SELECT_EXPENSE_DETAILS} WHERE e.month = ?`;
    const params = userId != null ? [month, userId, limit, offset] : [month, limit, offset];
    const sql = `${base} ORDER BY e.date DESC, e.created_at DESC LIMIT ? OFFSET ?`;
    const rows = all<ExpenseDetailsRow>(sql, params);
    return rows.map(toExpenseWithDetails);
  }

  async countByMonth(month: string, userId?: number): Promise<number> {
    const sql = userId != null
      ? "SELECT COUNT(id) AS c FROM expenses WHERE month = ? AND user_id = ?"
      : "SELECT COUNT(id) AS c FROM expenses WHERE month = ?";
    const params = userId != null ? [month, userId] : [month];
    const row = get<{ c: number }>(sql, params);
    return row?.c ?? 0;
  }

  async getSpendingByCategoryForMonths(months: string[], userId?: number): Promise<Record<number, number>> {
    if (months.length === 0) return {};
    const placeholders = months.map(() => "?").join(",");
    const sql = userId != null
      ? `SELECT category_id, SUM(amount) AS total FROM expenses WHERE user_id = ? AND month IN (${placeholders}) GROUP BY category_id`
      : `SELECT category_id, SUM(amount) AS total FROM expenses WHERE month IN (${placeholders}) GROUP BY category_id`;
    const params = userId != null ? [userId, ...months] : months;
    const rows = all<{ category_id: number; total: number }>(sql, params);
    const result: Record<number, number> = {};
    for (const r of rows) {
      result[r.category_id] = r.total;
    }
    return result;
  }

  async findById(id: number): Promise<ExpenseWithDetails | null> {
    const row = get<ExpenseDetailsRow>(
      `${SELECT_EXPENSE_DETAILS} WHERE e.id = ?`,
      [id]
    );
    return row ? toExpenseWithDetails(row) : null;
  }

  async create(data: CreateExpenseInput): Promise<{ id: number }> {
    run(
      "INSERT INTO expenses (user_id, category_id, amount, note, date, month, split_group_id, paid_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        data.userId,
        data.categoryId,
        data.amount,
        data.note ?? null,
        data.date,
        data.month,
        data.splitGroupId ?? null,
        data.paidByUserId ?? null,
      ]
    );
    return { id: lastInsertId() };
  }

  async update(id: number, data: UpdateExpenseInput): Promise<void> {
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
    if (data.date != null) {
      updates.push("date = ?");
      params.push(data.date);
    }
    if (data.month != null) {
      updates.push("month = ?");
      params.push(data.month);
    }
    if (updates.length === 0) return;
    params.push(id);
    run(`UPDATE expenses SET ${updates.join(", ")} WHERE id = ?`, params);
  }

  async delete(id: number): Promise<void> {
    run("DELETE FROM expenses WHERE id = ?", [id]);
  }

  async deleteBySplitGroupId(splitGroupId: string): Promise<void> {
    const row = get<{ id: number }>("SELECT id FROM expenses WHERE split_group_id = ? LIMIT 1", [splitGroupId]);
    if (!row) return;
    run("DELETE FROM split_allocations WHERE expense_id = ?", [row.id]);
    run("DELETE FROM expenses WHERE id = ?", [row.id]);
  }

  async findSplitExpenses(): Promise<ExpenseWithDetails[]> {
    const rows = all<ExpenseDetailsRow>(
      `${SELECT_EXPENSE_DETAILS} WHERE e.split_group_id IS NOT NULL ORDER BY e.date DESC, e.created_at DESC`
    );
    return rows.map(toExpenseWithDetails);
  }
}
