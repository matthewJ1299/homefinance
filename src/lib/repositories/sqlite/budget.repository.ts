import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { budgets, budgetTransfers } from "@/lib/db/schema";
import type {
  IBudgetRepository,
  BudgetAllocationWithMonth,
} from "../interfaces/budget.repository";

export class BudgetRepository implements IBudgetRepository {
  async getAllocationsForMonth(month: string) {
    const rows = await db
      .select({
        categoryId: budgets.categoryId,
        allocatedAmount: budgets.allocatedAmount,
      })
      .from(budgets)
      .where(eq(budgets.month, month));
    return rows;
  }

  async getAllocationsForMonths(months: string[]): Promise<BudgetAllocationWithMonth[]> {
    if (months.length === 0) return [];
    const rows = await db
      .select({
        categoryId: budgets.categoryId,
        allocatedAmount: budgets.allocatedAmount,
        month: budgets.month,
      })
      .from(budgets)
      .where(inArray(budgets.month, months));
    return rows;
  }

  async upsertAllocation(categoryId: number, month: string, amount: number): Promise<void> {
    await db
      .insert(budgets)
      .values({
        categoryId,
        month,
        allocatedAmount: amount,
      })
      .onConflictDoUpdate({
        target: [budgets.categoryId, budgets.month],
        set: {
          allocatedAmount: amount,
          updatedAt: sql`datetime('now')`,
        },
      });
  }

  async getTransfersForMonth(month: string) {
    const rows = await db
      .select()
      .from(budgetTransfers)
      .where(eq(budgetTransfers.month, month))
      .orderBy(budgetTransfers.createdAt);
    return rows.map((r) => ({
      id: r.id,
      fromCategoryId: r.fromCategoryId,
      toCategoryId: r.toCategoryId,
      month: r.month,
      amount: r.amount,
      userId: r.userId,
      reason: r.reason,
      createdAt: r.createdAt,
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
    await db.insert(budgetTransfers).values({
      fromCategoryId: data.fromCategoryId,
      toCategoryId: data.toCategoryId,
      month: data.month,
      amount: data.amount,
      userId: data.userId,
      reason: data.reason ?? null,
    });
  }
}
