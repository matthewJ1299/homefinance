import type { ExpenseWithDetails } from "@/lib/types";
import type { BudgetMonthPeriod } from "@/lib/types/budget-month";

export interface CreateExpenseInput {
  userId: number;
  categoryId: number;
  amount: number;
  note?: string | null;
  date: string;
  month: string;
  splitGroupId?: string | null;
  paidByUserId?: number | null;
  splitExpenseGroupId?: number | null;
  recurringExpenseId?: number | null;
  accountId?: number | null;
}

export interface UpdateExpenseInput {
  categoryId?: number;
  amount?: number;
  note?: string | null;
  date?: string;
  month?: string;
  accountId?: number | null;
}

export interface IExpenseRepository {
  findByMonth(
    month: string,
    userId?: number,
    accountId?: number,
    period?: BudgetMonthPeriod
  ): Promise<ExpenseWithDetails[]>;
  findByMonthPaginated(
    month: string,
    limit: number,
    offset: number,
    userId?: number,
    accountId?: number,
    period?: BudgetMonthPeriod
  ): Promise<ExpenseWithDetails[]>;
  countByMonth(month: string, userId?: number, accountId?: number, period?: BudgetMonthPeriod): Promise<number>;
  findById(id: number): Promise<ExpenseWithDetails | null>;
  findAllByUserId(userId: number): Promise<ExpenseWithDetails[]>;
  getSpendingByCategoryForMonths(
    months: string[],
    userId?: number,
    budgetMonthStartDay?: number
  ): Promise<Record<number, number>>;
  /** Count of expenses per category (all time). */
  getUsageCountsByCategory(userId?: number): Promise<Record<number, number>>;
  create(data: CreateExpenseInput): Promise<{ id: number }>;
  update(id: number, data: UpdateExpenseInput): Promise<void>;
  delete(id: number): Promise<void>;
  deleteBySplitGroupId(splitGroupId: string): Promise<void>;
  findSplitExpenses(groupId?: number): Promise<ExpenseWithDetails[]>;
  hasExpenseFromRecurring(recurringExpenseId: number, month: string): Promise<boolean>;
}
