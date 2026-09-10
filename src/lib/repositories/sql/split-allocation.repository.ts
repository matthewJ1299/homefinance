import { all, run, lastInsertId, get } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
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

  /**
   * Backs the balances shown on Home, so it runs on every render.
   *
   * The names come from the join. They used to come from two extra `SELECT name
   * FROM users` per allocation row -- 1,001 queries for 500 allocations -- and
   * both joins are tenant-scoped through the expense's household, exactly as
   * the per-row lookups were.
   */
  /**
   * Allocations for many expenses at once, grouped by expense id.
   *
   * The splits history rendered one `findByExpenseId` -- a three-table join --
   * per split expense. One query covers the page.
   */
  async findByExpenseIds(expenseIds: number[]): Promise<Map<number, SplitAllocationWithUser[]>> {
    const hid = requireHouseholdId();
    const unique = [...new Set(expenseIds.filter((id) => Number.isInteger(id) && id > 0))];
    if (unique.length === 0) return new Map();
    const placeholders = unique.map(() => "?").join(", ");
    const rows = await all<RowWithUser>(
      `SELECT sa.id, sa.expense_id AS expense_id, sa.user_id AS user_id, sa.amount, u.name
         FROM split_allocations sa
         INNER JOIN expenses e ON sa.expense_id = e.id
         INNER JOIN users u ON sa.user_id = u.id AND u.household_id = e.household_id
        WHERE e.household_id = ? AND sa.expense_id IN (${placeholders})
        ORDER BY sa.expense_id, sa.id`,
      [hid, ...unique]
    );
    const byExpense = new Map<number, SplitAllocationWithUser[]>();
    for (const r of rows) {
      const list = byExpense.get(r.expense_id) ?? [];
      list.push({
        id: r.id,
        expenseId: r.expense_id,
        userId: r.user_id,
        amount: r.amount,
        userName: r.name,
      });
      byExpense.set(r.expense_id, list);
    }
    return byExpense;
  }

  async findAllForBalance(groupId?: number): Promise<SplitAllocationBalanceRow[]> {
    const hid = requireHouseholdId();
    let sql = `
      SELECT sa.amount,
             e.paid_by_user_id,
             payer.name AS payer_name,
             sa.user_id AS allocation_user_id,
             debtor.name AS debtor_name
        FROM split_allocations sa
        INNER JOIN expenses e ON sa.expense_id = e.id
        LEFT JOIN users payer
               ON payer.id = e.paid_by_user_id AND payer.household_id = e.household_id
        LEFT JOIN users debtor
               ON debtor.id = sa.user_id AND debtor.household_id = e.household_id
       WHERE e.household_id = ? AND e.paid_by_user_id IS NOT NULL`;
    const params: number[] = [hid];
    if (groupId != null) {
      sql += " AND e.split_expense_group_id = ?";
      params.push(groupId);
    }
    const rows = await all<{
      amount: number;
      paid_by_user_id: number;
      payer_name: string | null;
      allocation_user_id: number;
      debtor_name: string | null;
    }>(sql, params);
    return rows.map((r) => ({
      amount: r.amount,
      paidByUserId: r.paid_by_user_id,
      paidByUserName: r.payer_name ?? "?",
      allocationUserId: r.allocation_user_id,
      allocationUserName: r.debtor_name ?? "?",
    }));
  }

  async findOwedToPayerInPeriod(
    payerUserId: number,
    debtorUserId: number,
    start: string,
    end: string,
    groupId?: number
  ): Promise<OwedLineItemRow[]> {
    // This was the one query in the repository layer that neither called
    // requireHouseholdId() nor filtered on household_id -- so it failed OPEN
    // where everything else fails closed. The callers happen to pass ids drawn
    // from tenant-scoped data, which is what kept it from being exploitable.
    const hid = requireHouseholdId();
    let sql = `
      SELECT e.id AS "expenseId", e.note, e.date, c.name AS "categoryName", sa.amount
      FROM split_allocations sa
      INNER JOIN expenses e ON sa.expense_id = e.id
      LEFT JOIN categories c ON e.category_id = c.id AND c.household_id = e.household_id
      WHERE e.household_id = ?
        AND e.paid_by_user_id = ?
        AND sa.user_id = ?
        AND e.date >= ? AND e.date <= ?`;
    const params: (number | string)[] = [hid, payerUserId, debtorUserId, start, end];
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
    const hid = requireHouseholdId();
    await run(
      `DELETE FROM split_allocations WHERE expense_id IN (
         SELECT id FROM expenses WHERE id = ? AND household_id = ?
       )`,
      [expenseId, hid]
    );
  }
}
