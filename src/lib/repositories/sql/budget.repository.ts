import { all, run } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import type {
  IBudgetRepository,
  BudgetAllocationWithMonth,
  BudgetMonthOpenState,
} from "../interfaces/budget.repository";

interface BudgetRow {
  category_id: number;
  allocated_amount: number;
  month?: string;
}

interface TransferRow {
  id: number;
  from_category_id: number;
  to_category_id: number;
  month: string;
  amount: number;
  user_id: number;
  reason: string | null;
  created_at: string;
}

export class BudgetRepository implements IBudgetRepository {
  async getAllocationsForMonth(month: string, userId: number) {
    const hid = requireHouseholdId();
    const rows = await all<BudgetRow>(
      "SELECT category_id, allocated_amount FROM budgets WHERE month = ? AND user_id = ? AND household_id = ?",
      [month, userId, hid]
    );
    return rows.map((r) => ({
      categoryId: r.category_id,
      allocatedAmount: r.allocated_amount,
    }));
  }

  async getAllocationsForMonths(months: string[], userId: number): Promise<BudgetAllocationWithMonth[]> {
    if (months.length === 0) return [];
    const hid = requireHouseholdId();
    const placeholders = months.map(() => "?").join(",");
    const rows = await all<BudgetRow & { month: string }>(
      `SELECT category_id, allocated_amount, month FROM budgets WHERE household_id = ? AND user_id = ? AND month IN (${placeholders})`,
      [hid, userId, ...months]
    );
    return rows.map((r) => ({
      categoryId: r.category_id,
      allocatedAmount: r.allocated_amount,
      month: r.month,
    }));
  }

  async upsertAllocation(categoryId: number, month: string, amount: number, userId: number): Promise<void> {
    const hid = requireHouseholdId();
    await run(
      `INSERT INTO budgets (user_id, household_id, category_id, month, allocated_amount) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (household_id, category_id, month, user_id) DO UPDATE SET allocated_amount = excluded.allocated_amount, updated_at = NOW()`,
      [userId, hid, categoryId, month, amount]
    );
  }

  async getCarriedInForMonth(month: string, userId: number): Promise<Map<number, number>> {
    const hid = requireHouseholdId();
    const rows = await all<{ category_id: number; carried_in_minor: number }>(
      "SELECT category_id, carried_in_minor FROM budgets WHERE month = ? AND user_id = ? AND household_id = ? AND carried_in_minor <> 0",
      [month, userId, hid]
    );
    return new Map(rows.map((r) => [r.category_id, r.carried_in_minor]));
  }

  async setCarriedIn(categoryId: number, month: string, amount: number, userId: number): Promise<void> {
    const hid = requireHouseholdId();
    await run(
      `INSERT INTO budgets (user_id, household_id, category_id, month, allocated_amount, carried_in_minor)
       VALUES (?, ?, ?, ?, 0, ?)
       ON CONFLICT (household_id, category_id, month, user_id)
       DO UPDATE SET carried_in_minor = excluded.carried_in_minor, updated_at = NOW()`,
      [userId, hid, categoryId, month, amount]
    );
  }

  async adjustCarriedIn(
    categoryId: number,
    month: string,
    delta: number,
    userId: number
  ): Promise<void> {
    const hid = requireHouseholdId();
    await run(
      `UPDATE budgets
          SET carried_in_minor = GREATEST(0, carried_in_minor + ?), updated_at = NOW()
        WHERE category_id = ? AND month = ? AND user_id = ? AND household_id = ?`,
      [delta, categoryId, month, userId, hid]
    );
  }

  async getMonthOpenState(month: string, userId: number): Promise<BudgetMonthOpenState | null> {
    const hid = requireHouseholdId();
    const rows = await all<{ month: string; overspend_carried_minor: number; opened_at: string }>(
      "SELECT month, overspend_carried_minor, opened_at FROM budget_month_opens WHERE month = ? AND user_id = ? AND household_id = ?",
      [month, userId, hid]
    );
    const r = rows[0];
    return r ? { month: r.month, overspendCarriedMinor: r.overspend_carried_minor, openedAt: r.opened_at } : null;
  }

  async recordMonthOpen(month: string, userId: number, overspendCarriedMinor: number): Promise<void> {
    const hid = requireHouseholdId();
    await run(
      `INSERT INTO budget_month_opens (household_id, user_id, month, overspend_carried_minor)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (household_id, user_id, month) DO NOTHING`,
      [hid, userId, month, overspendCarriedMinor]
    );
  }

  async getTransfersForMonth(month: string, userId: number) {
    const hid = requireHouseholdId();
    const rows = await all<TransferRow>(
      "SELECT id, from_category_id, to_category_id, month, amount, user_id, reason, created_at FROM budget_transfers WHERE month = ? AND user_id = ? AND household_id = ? ORDER BY created_at",
      [month, userId, hid]
    );
    return rows.map((r) => ({
      id: r.id,
      fromCategoryId: r.from_category_id,
      toCategoryId: r.to_category_id,
      month: r.month,
      amount: r.amount,
      userId: r.user_id,
      reason: r.reason,
      createdAt: r.created_at,
    }));
  }

  async createTransfer(data: {
    fromCategoryId: number;
    toCategoryId: number;
    month: string;
    amount: number;
    userId: number;
    reason?: string | null;
  }): Promise<void> {
    const hid = requireHouseholdId();
    await run(
      "INSERT INTO budget_transfers (from_category_id, to_category_id, month, amount, user_id, reason, household_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        data.fromCategoryId,
        data.toCategoryId,
        data.month,
        data.amount,
        data.userId,
        data.reason ?? null,
        hid,
      ]
    );
  }

  async deleteAllocationsForUser(userId: number): Promise<void> {
    const hid = requireHouseholdId();
    await run("DELETE FROM budgets WHERE user_id = ? AND household_id = ?", [userId, hid]);
  }

  async deleteMonthOpensForUser(userId: number): Promise<void> {
    const hid = requireHouseholdId();
    await run("DELETE FROM budget_month_opens WHERE user_id = ? AND household_id = ?", [userId, hid]);
  }

  async deleteTransfersForUser(userId: number): Promise<void> {
    const hid = requireHouseholdId();
    await run("DELETE FROM budget_transfers WHERE user_id = ? AND household_id = ?", [userId, hid]);
  }
}
