import type { ExpenseWithDetails } from "@/lib/types";

export interface CreateExpenseInput {
  userId: number;
  categoryId: number;
  amount: number;
  note?: string | null;
  date: string;
  month: string;
  splitGroupId?: string | null;
  paidByUserId?: number | null;
}

export interface UpdateExpenseInput {
  categoryId?: number;
  amount?: number;
  note?: string | null;
  date?: string;
  month?: string;
}

export interface IExpenseRepository {
  findByMonth(month: string, userId?: number): Promise<ExpenseWithDetails[]>;
  findByMonthPaginated(
    month: string,
    limit: number,
    offset: number,
    userId?: number
  ): Promise<ExpenseWithDetails[]>;
  countByMonth(month: string, userId?: number): Promise<number>;
  findById(id: number): Promise<ExpenseWithDetails | null>;
  getSpendingByCategoryForMonths(months: string[]): Promise<Record<number, number>>;
  create(data: CreateExpenseInput): Promise<{ id: number }>;
  update(id: number, data: UpdateExpenseInput): Promise<void>;
  delete(id: number): Promise<void>;
  deleteBySplitGroupId(splitGroupId: string): Promise<void>;
  findSplitExpenses(): Promise<ExpenseWithDetails[]>;
}
