import { getExpenseRepository } from "@/lib/repositories";
import { monthFromDate } from "@/lib/utils/date";
import type { ExpenseWithDetails } from "@/lib/types";
import type { CreateExpenseInput, UpdateExpenseInput } from "@/lib/repositories/interfaces/expense.repository";

export interface ExpensesByMonthResult {
  expenses: ExpenseWithDetails[];
  totals: {
    overall: number;
    byUser: Record<number, number>;
    byCategory: Record<number, number>;
  };
}

export class ExpenseService {
  constructor(private repo = getExpenseRepository()) {}

  async getSpendingByCategoryForMonths(months: string[], userId?: number): Promise<Record<number, number>> {
    return this.repo.getSpendingByCategoryForMonths(months, userId);
  }

  async getByMonthPaginated(
    month: string,
    page: number,
    pageSize: number,
    userId?: number
  ): Promise<{
    expenses: ExpenseWithDetails[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const total = await this.repo.countByMonth(month, userId);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const offset = (safePage - 1) * pageSize;
    const expenses = await this.repo.findByMonthPaginated(month, pageSize, offset, userId);
    return {
      expenses,
      total,
      page: safePage,
      pageSize,
      totalPages,
    };
  }

  async getByMonth(month: string, userId?: number): Promise<ExpensesByMonthResult> {
    const expenses = await this.repo.findByMonth(month, userId);
    const totals = {
      overall: 0,
      byUser: {} as Record<number, number>,
      byCategory: {} as Record<number, number>,
    };
    for (const e of expenses) {
      totals.overall += e.amount;
      totals.byUser[e.userId] = (totals.byUser[e.userId] ?? 0) + e.amount;
      totals.byCategory[e.categoryId] = (totals.byCategory[e.categoryId] ?? 0) + e.amount;
    }
    return { expenses, totals };
  }

  async create(
    userId: number,
    data: Omit<CreateExpenseInput, "userId" | "month">
  ): Promise<{ id: number }> {
    const month = monthFromDate(data.date);
    return this.repo.create({
      userId,
      categoryId: data.categoryId,
      amount: data.amount,
      note: data.note,
      date: data.date,
      month,
    });
  }

  async update(id: number, userId: number, data: UpdateExpenseInput): Promise<void> {
    const payload: UpdateExpenseInput = { ...data };
    if (data.date) payload.month = monthFromDate(data.date);
    await this.repo.update(id, payload);
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
