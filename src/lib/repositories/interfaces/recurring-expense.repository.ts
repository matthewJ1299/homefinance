import type { RecurringExpense } from "@/lib/types";

export interface IRecurringExpenseRepository {
  findAll(): Promise<RecurringExpense[]>;
  findByUserId(userId: number): Promise<RecurringExpense[]>;
  findById(id: number): Promise<RecurringExpense | null>;
  create(data: {
    userId: number;
    categoryId: number;
    amount: number;
    note?: string | null;
    dayOfMonth: number;
  }): Promise<RecurringExpense>;
  update(
    id: number,
    data: {
      categoryId?: number;
      amount?: number;
      note?: string | null;
      dayOfMonth?: number;
    }
  ): Promise<void>;
  delete(id: number): Promise<void>;
}
