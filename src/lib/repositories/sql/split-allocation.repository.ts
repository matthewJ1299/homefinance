import { all, run, lastInsertId, get } from "@/lib/db";
import type {
  ISplitAllocationRepository,
  SplitAllocationWithUser,
  SplitAllocationBalanceRow,
  OwedLineItemRow,
} from "../interfaces/split-allocation.repository";

interface RowWithUser {
  id: number;
  expense_id: number;
  user_id: number;
  amount: number;
  name: string;
}

export class SplitAllocationRepository implements ISplitAllocationRepository {
  async create(expenseId: number, userId: number, amount: number): Promise<{ id: number }> {
    await run("INSERT INTO split_allocations (expense_id, user_id, amount) VALUES (?, ?, ?)", [
      expenseId,
      userId,
      amount,
    ]);
    return { id: await lastInsertId() };
  }

  async findByExpenseId(expenseId: number): Promise<SplitAllocationWithUser[]> {
    const rows = await all<RowWithUser>(
      "SELECT sa.id, sa.expense_id AS expense_id, sa.user_id AS user_id, sa.amount, u.name FROM split_allocations sa INNER JOIN users u ON sa.user_id = u.id WHERE sa.expense_id = ?",
      [expenseId]
    );
    return rows.map((r) => ({
      id: r.id,
      expenseId: r.expense_id,
      userId: r.user_id,
      amount: r.amount,
      userName: r.name,
    }));
  }

  async findAllForBalance(groupId?: number): Promise<SplitAllocationBalanceRow[]> {
    let sql =
      "SELECT sa.amount, e.paid_by_user_id, sa.user_id AS allocation_user_id FROM split_allocations sa INNER JOIN expenses e ON sa.expense_id = e.id WHERE e.paid_by_user_id IS NOT NULL";
    const params: number[] = [];
    if (groupId != null) {
      sql += " AND e.split_expense_group_id = ?";
      params.push(groupId);
    }
    const rows = await all<{
      amount: number;
      paid_by_user_id: number;
      allocation_user_id: number;
    }>(sql, params);
    const result: SplitAllocationBalanceRow[] = [];
    for (const r of rows) {
      const payer = await get<{ name: string }>("SELECT name FROM users WHERE id = ?", [r.paid_by_user_id]);
      const allocUser = await get<{ name: string }>("SELECT name FROM users WHERE id = ?", [r.allocation_user_id]);
      result.push({
        amount: r.amount,
        paidByUserId: r.paid_by_user_id,
        paidByUserName: payer?.name ?? "?",
        allocationUserId: r.allocation_user_id,
        allocationUserName: allocUser?.name ?? "?",
      });
    }
    return result;
  }

  async findOwedToPayerInPeriod(
    payerUserId: number,
    debtorUserId: number,
    start: string,
    end: string,
    groupId?: number
  ): Promise<OwedLineItemRow[]> {
    let sql = `
      SELECT e.id AS "expenseId", e.note, e.date, c.name AS "categoryName", sa.amount
      FROM split_allocations sa
      INNER JOIN expenses e ON sa.expense_id = e.id
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.paid_by_user_id = ?
        AND sa.user_id = ?
        AND e.date >= ? AND e.date <= ?`;
    const params: (number | string)[] = [payerUserId, debtorUserId, start, end];
    if (groupId != null) {
      sql += " AND e.split_expense_group_id = ?";
      params.push(groupId);
    }
    sql += " ORDER BY e.date, e.id";
    const rows = await all<{
      expenseId: number;
      note: string | null;
      date: string;
      categoryName: string | null;
      amount: number;
    }>(sql, params);
    return rows.map((r) => ({
      expenseId: r.expenseId,
      note: r.note ?? null,
      date: r.date,
      categoryName: r.categoryName ?? null,
      amount: r.amount,
    }));
  }

  async deleteByExpenseId(expenseId: number): Promise<void> {
    await run("DELETE FROM split_allocations WHERE expense_id = ?", [expenseId]);
  }
}
