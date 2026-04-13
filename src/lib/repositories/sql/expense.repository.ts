import { all, get, run, lastInsertId } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import type { ExpenseWithDetails } from "@/lib/types";
import type { BudgetMonthPeriod } from "@/lib/types/budget-month";
import { getBudgetPeriodForMonthKey, normalizeBudgetMonthStartDay } from "@/lib/utils/date";
import type {
  IExpenseRepository,
  CreateExpenseInput,
  UpdateExpenseInput,
} from "../interfaces/expense.repository";

const SELECT_EXPENSE_DETAILS = `
  SELECT e.id, e.user_id AS "userId", u.name AS "userName", e.category_id AS "categoryId", c.name AS "categoryName",
         e.amount, e.note, e.date, e.month AS "month", e.created_at AS "createdAt", e.split_group_id AS "splitGroupId", e.paid_by_user_id AS "paidByUserId", e.split_expense_group_id AS "splitExpenseGroupId", e.account_id AS "accountId"
  FROM expenses e
  INNER JOIN users u ON e.user_id = u.id AND u.household_id = e.household_id
  INNER JOIN categories c ON e.category_id = c.id AND c.household_id = e.household_id
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
  month: string;
  createdAt: string;
  splitGroupId: string | null;
  paidByUserId: number | null;
  splitExpenseGroupId?: number | null;
  /** Postgres BIGINT may arrive as string from node-pg. */
  accountId?: number | null | string;
}

function toExpenseWithDetails(r: ExpenseDetailsRow): ExpenseWithDetails {
  const accountIdRaw = r.accountId;
  const accountId =
    accountIdRaw != null && accountIdRaw !== ""
      ? Number(accountIdRaw)
      : undefined;
  return {
    id: r.id,
    userId: r.userId,
    userName: r.userName,
    categoryId: r.categoryId,
    categoryName: r.categoryName,
    amount: r.amount,
    note: r.note,
    date: r.date,
    month: r.month,
    createdAt: r.createdAt,
    splitGroupId: r.splitGroupId,
    paidByUserId: r.paidByUserId,
    splitExpenseGroupId: r.splitExpenseGroupId ?? undefined,
    accountId: Number.isFinite(accountId) ? accountId : undefined,
  };
}

export class ExpenseRepository implements IExpenseRepository {
  async findByMonth(
    month: string,
    userId?: number,
    accountId?: number,
    period?: BudgetMonthPeriod
  ): Promise<ExpenseWithDetails[]> {
    const hid = requireHouseholdId();
    let sql = `${SELECT_EXPENSE_DETAILS} WHERE e.household_id = ? AND `;
    const params: (string | number)[] = [hid];
    if (period) {
      sql += "e.date >= ? AND e.date <= ?";
      params.push(period.start, period.end);
    } else {
      sql += "e.month = ?";
      params.push(month);
    }
    if (userId != null) {
      sql += " AND e.user_id = ?";
      params.push(userId);
    }
    if (accountId != null) {
      sql += " AND e.account_id = ?";
      params.push(accountId);
    }
    sql += " ORDER BY e.date, e.created_at";
    const rows = await all<ExpenseDetailsRow>(sql, params);
    return rows.map(toExpenseWithDetails);
  }

  async findByMonthPaginated(
    month: string,
    limit: number,
    offset: number,
    userId?: number,
    accountId?: number,
    period?: BudgetMonthPeriod
  ): Promise<ExpenseWithDetails[]> {
    const hid = requireHouseholdId();
    let base = `${SELECT_EXPENSE_DETAILS} WHERE e.household_id = ? AND `;
    const params: (string | number)[] = [hid];
    if (period) {
      base += "e.date >= ? AND e.date <= ?";
      params.push(period.start, period.end);
    } else {
      base += "e.month = ?";
      params.push(month);
    }
    if (userId != null) {
      base += " AND e.user_id = ?";
      params.push(userId);
    }
    if (accountId != null) {
      base += " AND e.account_id = ?";
      params.push(accountId);
    }
    const sql = `${base} ORDER BY e.date DESC, e.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    const rows = await all<ExpenseDetailsRow>(sql, params);
    return rows.map(toExpenseWithDetails);
  }

  async countByMonth(
    month: string,
    userId?: number,
    accountId?: number,
    period?: BudgetMonthPeriod
  ): Promise<number> {
    const hid = requireHouseholdId();
    let sql = "SELECT COUNT(id) AS c FROM expenses WHERE household_id = ? AND ";
    const params: (string | number)[] = [hid];
    if (period) {
      sql += "date >= ? AND date <= ?";
      params.push(period.start, period.end);
    } else {
      sql += "month = ?";
      params.push(month);
    }
    if (userId != null) {
      sql += " AND user_id = ?";
      params.push(userId);
    }
    if (accountId != null) {
      sql += " AND account_id = ?";
      params.push(accountId);
    }
    const row = await get<{ c: number }>(sql, params);
    return row?.c ?? 0;
  }

  async getSpendingByCategoryForMonths(
    months: string[],
    userId?: number,
    budgetMonthStartDay?: number
  ): Promise<Record<number, number>> {
    if (months.length === 0) return {};
    const hid = requireHouseholdId();
    if (budgetMonthStartDay === undefined) {
      const placeholders = months.map(() => "?").join(",");
      const sql =
        userId != null
          ? `SELECT category_id, SUM(amount) AS total FROM expenses WHERE household_id = ? AND user_id = ? AND month IN (${placeholders}) GROUP BY category_id`
          : `SELECT category_id, SUM(amount) AS total FROM expenses WHERE household_id = ? AND month IN (${placeholders}) GROUP BY category_id`;
      const params = userId != null ? [hid, userId, ...months] : [hid, ...months];
      const rows = await all<{ category_id: number; total: number }>(sql, params);
      const result: Record<number, number> = {};
      for (const r of rows) {
        result[r.category_id] = r.total;
      }
      return result;
    }
    const d = normalizeBudgetMonthStartDay(budgetMonthStartDay);
    const periods = months.map((m) => getBudgetPeriodForMonthKey(m, d));
    const orParts = periods.map(() => "(date >= ? AND date <= ?)").join(" OR ");
    const params: (string | number)[] = [hid];
    if (userId != null) params.push(userId);
    for (const p of periods) {
      params.push(p.start, p.end);
    }
    const sql =
      userId != null
        ? `SELECT category_id, SUM(amount) AS total FROM expenses WHERE household_id = ? AND user_id = ? AND (${orParts}) GROUP BY category_id`
        : `SELECT category_id, SUM(amount) AS total FROM expenses WHERE household_id = ? AND (${orParts}) GROUP BY category_id`;
    const rows = await all<{ category_id: number; total: number }>(sql, params);
    const result: Record<number, number> = {};
    for (const r of rows) {
      result[r.category_id] = r.total;
    }
    return result;
  }

  async getUsageCountsByCategory(userId?: number): Promise<Record<number, number>> {
    const hid = requireHouseholdId();
    const sql =
      userId != null
        ? "SELECT category_id, COUNT(id) AS c FROM expenses WHERE household_id = ? AND user_id = ? GROUP BY category_id"
        : "SELECT category_id, COUNT(id) AS c FROM expenses WHERE household_id = ? GROUP BY category_id";
    const params = userId != null ? [hid, userId] : [hid];
    const rows = await all<{ category_id: number; c: number }>(sql, params);
    const result: Record<number, number> = {};
    for (const r of rows) {
      result[r.category_id] = r.c;
    }
    return result;
  }

  async findById(id: number): Promise<ExpenseWithDetails | null> {
    const hid = requireHouseholdId();
    const row = await get<ExpenseDetailsRow>(
      `${SELECT_EXPENSE_DETAILS} WHERE e.id = ? AND e.household_id = ?`,
      [id, hid]
    );
    return row ? toExpenseWithDetails(row) : null;
  }

  async findByIdsForUser(ids: number[], userId: number): Promise<ExpenseWithDetails[]> {
    const hid = requireHouseholdId();
    const unique = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
    if (unique.length === 0) return [];
    const placeholders = unique.map(() => "?").join(", ");
    const rows = await all<ExpenseDetailsRow>(
      `${SELECT_EXPENSE_DETAILS} WHERE e.household_id = ? AND e.user_id = ? AND e.id IN (${placeholders})`,
      [hid, userId, ...unique]
    );
    return rows.map(toExpenseWithDetails);
  }

  async findAllByUserId(userId: number): Promise<ExpenseWithDetails[]> {
    const hid = requireHouseholdId();
    const sql = `${SELECT_EXPENSE_DETAILS} WHERE e.household_id = ? AND e.user_id = ? ORDER BY e.date ASC, e.created_at ASC, e.id ASC`;
    const rows = await all<ExpenseDetailsRow>(sql, [hid, userId]);
    return rows.map(toExpenseWithDetails);
  }

  async create(data: CreateExpenseInput): Promise<{ id: number }> {
    const hid = requireHouseholdId();
    await run(
      "INSERT INTO expenses (user_id, household_id, category_id, amount, note, date, month, split_group_id, paid_by_user_id, split_expense_group_id, recurring_expense_id, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        data.userId,
        hid,
        data.categoryId,
        data.amount,
        data.note ?? null,
        data.date,
        data.month,
        data.splitGroupId ?? null,
        data.paidByUserId ?? null,
        data.splitExpenseGroupId ?? null,
        data.recurringExpenseId ?? null,
        data.accountId ?? null,
      ]
    );
    return { id: await lastInsertId() };
  }

  async hasExpenseFromRecurring(recurringExpenseId: number, month: string): Promise<boolean> {
    const hid = requireHouseholdId();
    const row = await get<{ id: number }>(
      "SELECT id FROM expenses WHERE household_id = ? AND recurring_expense_id = ? AND month = ? LIMIT 1",
      [hid, recurringExpenseId, month]
    );
    return !!row;
  }

  async findByUserDateAndAmount(userId: number, date: string, amount: number): Promise<ExpenseWithDetails[]> {
    const hid = requireHouseholdId();
    const rows = await all<ExpenseDetailsRow>(
      `${SELECT_EXPENSE_DETAILS} WHERE e.household_id = ? AND e.user_id = ? AND e.date = ? AND e.amount = ? ORDER BY e.id ASC`,
      [hid, userId, date, amount]
    );
    return rows.map(toExpenseWithDetails);
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
    const hid = requireHouseholdId();
    params.push(id, hid);
    await run(`UPDATE expenses SET ${updates.join(", ")} WHERE id = ? AND household_id = ?`, params);
  }

  async delete(id: number): Promise<void> {
    const hid = requireHouseholdId();
    await run("DELETE FROM expenses WHERE id = ? AND household_id = ?", [id, hid]);
  }

  async deleteBySplitGroupId(splitGroupId: string): Promise<void> {
    const hid = requireHouseholdId();
    const row = await get<{ id: number }>(
      "SELECT id FROM expenses WHERE household_id = ? AND split_group_id = ? LIMIT 1",
      [hid, splitGroupId]
    );
    if (!row) return;
    await run("DELETE FROM split_allocations WHERE expense_id = ?", [row.id]);
    await run("DELETE FROM expenses WHERE id = ?", [row.id]);
  }

  async findSplitExpenses(groupId?: number): Promise<ExpenseWithDetails[]> {
    const hid = requireHouseholdId();
    let sql = `${SELECT_EXPENSE_DETAILS} WHERE e.household_id = ? AND e.split_group_id IS NOT NULL`;
    const params: (string | number | boolean | null)[] = [hid];
    if (groupId != null) {
      sql += " AND e.split_expense_group_id = ?";
      params.push(groupId);
    }
    sql += " ORDER BY e.date DESC, e.created_at DESC";
    const rows = await all<ExpenseDetailsRow>(sql, params);
    return rows.map(toExpenseWithDetails);
  }
}
