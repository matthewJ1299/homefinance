import { eq, inArray, sum, desc, count, and, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { expenses, users, categories, splitAllocations } from "@/lib/db/schema";
import type { ExpenseWithDetails } from "@/lib/types";
import type {
  IExpenseRepository,
  CreateExpenseInput,
  UpdateExpenseInput,
} from "../interfaces/expense.repository";

function monthCondition(month: string, userId?: number) {
  const monthEq = eq(expenses.month, month);
  return userId != null ? and(monthEq, eq(expenses.userId, userId)) : monthEq;
}

export class ExpenseRepository implements IExpenseRepository {
  async findByMonth(month: string, userId?: number): Promise<ExpenseWithDetails[]> {
    const rows = await db
      .select({
        id: expenses.id,
        userId: expenses.userId,
        userName: users.name,
        categoryId: expenses.categoryId,
        categoryName: categories.name,
        amount: expenses.amount,
        note: expenses.note,
        date: expenses.date,
        createdAt: expenses.createdAt,
        splitGroupId: expenses.splitGroupId,
        paidByUserId: expenses.paidByUserId,
      })
      .from(expenses)
      .innerJoin(users, eq(expenses.userId, users.id))
      .innerJoin(categories, eq(expenses.categoryId, categories.id))
      .where(monthCondition(month, userId))
      .orderBy(expenses.date, expenses.createdAt);
    return rows as ExpenseWithDetails[];
  }

  async findByMonthPaginated(
    month: string,
    limit: number,
    offset: number,
    userId?: number
  ): Promise<ExpenseWithDetails[]> {
    const rows = await db
      .select({
        id: expenses.id,
        userId: expenses.userId,
        userName: users.name,
        categoryId: expenses.categoryId,
        categoryName: categories.name,
        amount: expenses.amount,
        note: expenses.note,
        date: expenses.date,
        createdAt: expenses.createdAt,
        splitGroupId: expenses.splitGroupId,
        paidByUserId: expenses.paidByUserId,
      })
      .from(expenses)
      .innerJoin(users, eq(expenses.userId, users.id))
      .innerJoin(categories, eq(expenses.categoryId, categories.id))
      .where(monthCondition(month, userId))
      .orderBy(desc(expenses.date), desc(expenses.createdAt))
      .limit(limit)
      .offset(offset);
    return rows as ExpenseWithDetails[];
  }

  async countByMonth(month: string, userId?: number): Promise<number> {
    const [row] = await db
      .select({ value: count(expenses.id) })
      .from(expenses)
      .where(monthCondition(month, userId));
    return Number(row?.value ?? 0);
  }

  async getSpendingByCategoryForMonths(months: string[]): Promise<Record<number, number>> {
    if (months.length === 0) return {};
    const rows = await db
      .select({
        categoryId: expenses.categoryId,
        total: sum(expenses.amount),
      })
      .from(expenses)
      .where(inArray(expenses.month, months))
      .groupBy(expenses.categoryId);
    const result: Record<number, number> = {};
    for (const r of rows) {
      if (r.categoryId != null && r.total != null) {
        result[r.categoryId] = Number(r.total);
      }
    }
    return result;
  }

  async findById(id: number): Promise<ExpenseWithDetails | null> {
    const [row] = await db
      .select({
        id: expenses.id,
        userId: expenses.userId,
        userName: users.name,
        categoryId: expenses.categoryId,
        categoryName: categories.name,
        amount: expenses.amount,
        note: expenses.note,
        date: expenses.date,
        createdAt: expenses.createdAt,
        splitGroupId: expenses.splitGroupId,
        paidByUserId: expenses.paidByUserId,
      })
      .from(expenses)
      .innerJoin(users, eq(expenses.userId, users.id))
      .innerJoin(categories, eq(expenses.categoryId, categories.id))
      .where(eq(expenses.id, id))
      .limit(1);
    return (row as ExpenseWithDetails) ?? null;
  }

  async create(data: CreateExpenseInput): Promise<{ id: number }> {
    const [inserted] = await db
      .insert(expenses)
      .values({
        userId: data.userId,
        categoryId: data.categoryId,
        amount: data.amount,
        note: data.note ?? null,
        date: data.date,
        month: data.month,
        splitGroupId: data.splitGroupId ?? null,
        paidByUserId: data.paidByUserId ?? null,
      })
      .returning({ id: expenses.id });
    return { id: inserted!.id };
  }

  async update(id: number, data: UpdateExpenseInput): Promise<void> {
    await db
      .update(expenses)
      .set({
        ...(data.categoryId != null && { categoryId: data.categoryId }),
        ...(data.amount != null && { amount: data.amount }),
        ...(data.note !== undefined && { note: data.note }),
        ...(data.date != null && { date: data.date }),
        ...(data.month != null && { month: data.month }),
      })
      .where(eq(expenses.id, id));
  }

  async delete(id: number): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  async deleteBySplitGroupId(splitGroupId: string): Promise<void> {
    const [row] = await db
      .select({ id: expenses.id })
      .from(expenses)
      .where(eq(expenses.splitGroupId, splitGroupId))
      .limit(1);
    if (!row) return;
    await db.delete(splitAllocations).where(eq(splitAllocations.expenseId, row.id));
    await db.delete(expenses).where(eq(expenses.id, row.id));
  }

  async findSplitExpenses(): Promise<ExpenseWithDetails[]> {
    const rows = await db
      .select({
        id: expenses.id,
        userId: expenses.userId,
        userName: users.name,
        categoryId: expenses.categoryId,
        categoryName: categories.name,
        amount: expenses.amount,
        note: expenses.note,
        date: expenses.date,
        createdAt: expenses.createdAt,
        splitGroupId: expenses.splitGroupId,
        paidByUserId: expenses.paidByUserId,
      })
      .from(expenses)
      .innerJoin(users, eq(expenses.userId, users.id))
      .innerJoin(categories, eq(expenses.categoryId, categories.id))
      .where(isNotNull(expenses.splitGroupId))
      .orderBy(desc(expenses.date), desc(expenses.createdAt));
    return rows as ExpenseWithDetails[];
  }
}
