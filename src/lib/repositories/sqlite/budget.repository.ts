import { all, run } from "@/lib/db";
import type {
  IBudgetRepository,
  BudgetAllocationWithMonth,
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
    const rows = await all<BudgetRow>(
      "SELECT category_id, allocated_amount FROM budgets WHERE month = ? AND user_id = ?",
      [month, userId]
    );
    return rows.map((r) => ({
      categoryId: r.category_id,
      allocatedAmount: r.allocated_amount,
    }));
  }

  async getAllocationsForMonths(months: string[], userId: number): Promise<BudgetAllocationWithMonth[]> {
    if (months.length === 0) return [];
    const placeholders = months.map(() => "?").join(",");
    const rows = await all<BudgetRow & { month: string }>(
      `SELECT category_id, allocated_amount, month FROM budgets WHERE user_id = ? AND month IN (${placeholders})`,
      [userId, ...months]
    );
    return rows.map((r) => ({
      categoryId: r.category_id,
      allocatedAmount: r.allocated_amount,
      month: r.month,
    }));
  }

  async upsertAllocation(categoryId: number, month: string, amount: number, userId: number): Promise<void> {
    await run(
      `INSERT INTO budgets (user_id, category_id, month, allocated_amount) VALUES (?, ?, ?, ?)
       ON CONFLICT (user_id, category_id, month) DO UPDATE SET allocated_amount = excluded.allocated_amount, updated_at = datetime('now')`,
      [userId, categoryId, month, amount]
    );
  }

  async getTransfersForMonth(month: string, userId: number) {
    const rows = await all<TransferRow>(
      "SELECT id, from_category_id, to_category_id, month, amount, user_id, reason, created_at FROM budget_transfers WHERE month = ? AND user_id = ? ORDER BY created_at",
      [month, userId]
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
    await run(
      "INSERT INTO budget_transfers (from_category_id, to_category_id, month, amount, user_id, reason) VALUES (?, ?, ?, ?, ?, ?)",
      [
        data.fromCategoryId,
        data.toCategoryId,
        data.month,
        data.amount,
        data.userId,
        data.reason ?? null,
      ]
    );
  }
}
