import { all, run, lastInsertId, get } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import type {
  SplitAllocationWithUser,
  SplitAllocationBalanceRow,
} from "../interfaces/split-allocation.repository";

interface RowWithUser {
  id: number;
  expense_id: number;
  user_id: number;
  amount: number;
  name: string;
}

export class SplitAllocationRepository {
  async create(expenseId: number, userId: number, amount: number): Promise<{ id: number }> {
    const hid = requireHouseholdId();
    const ex = await get<{ id: number }>(
      "SELECT id FROM expenses WHERE id = ? AND household_id = ? LIMIT 1",
      [expenseId, hid]
    );
    if (!ex) {
      throw new Error("Expense not found for this household");
    }
    await run("INSERT INTO split_allocations (expense_id, user_id, amount) VALUES (?, ?, ?)", [
      expenseId,
      userId,
      amount,
    ]);
    return { id: await lastInsertId() };
  }

  async findByExpenseId(expenseId: number): Promise<SplitAllocationWithUser[]> {
    const hid = requireHouseholdId();
    const rows = await all<RowWithUser>(
      `SELECT sa.id, sa.expense_id AS expense_id, sa.user_id AS user_id, sa.amount, u.name
       FROM split_allocations sa
       INNER JOIN expenses e ON sa.expense_id = e.id
       INNER JOIN users u ON sa.user_id = u.id AND u.household_id = e.household_id
       WHERE sa.expense_id = ? AND e.household_id = ?`,
      [expenseId, hid]
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
    const hid = requireHouseholdId();
    let sql =
      `SELECT sa.amount, e.paid_by_user_id, sa.user_id AS allocation_user_id
       FROM split_allocations sa
       INNER JOIN expenses e ON sa.expense_id = e.id
       WHERE e.household_id = ? AND e.paid_by_user_id IS NOT NULL`;
    const params: number[] = [hid];
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
      const payer = await get<{ name: string }>(
        "SELECT name FROM users WHERE id = ? AND household_id = ?",
        [r.paid_by_user_id, hid]
      );
      const allocUser = await get<{ name: string }>(
        "SELECT name FROM users WHERE id = ? AND household_id = ?",
        [r.allocation_user_id, hid]
      );
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

  async deleteByExpenseId(expenseId: number): Promise<void> {
    const hid = requireHouseholdId();
    await run(
      `DELETE FROM split_allocations WHERE expense_id IN (
         SELECT id FROM expenses WHERE id = ? AND household_id = ?
       )`,
      [expenseId, hid]
    );
  }
}
