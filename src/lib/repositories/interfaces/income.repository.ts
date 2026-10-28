import type { IncomeType } from "@/lib/types";
import type { IncomeKind } from "@/lib/types/income-type";
import type { BudgetMonthPeriod } from "@/lib/types/budget-month";

export interface IncomeEntry {
  id: number;
  userId: number;
  userName: string;
  amount: number;
  type: IncomeType;
  /** The user-facing taxonomy (0037). `type` stays as the settlement flag. */
  incomeKind: IncomeKind;
  description: string | null;
  date: string;
  month: string;
  accountId?: number | null;
  createdAt: string;
}

export interface CreateIncomeInput {
  userId: number;
  amount: number;
  type: IncomeType;
  incomeKind?: IncomeKind;
  description?: string | null;
  date: string;
  month: string;
  recurringIncomeId?: number | null;
  accountId?: number | null;
}

export interface UpdateIncomeInput {
  amount?: number;
  type?: IncomeType;
  incomeKind?: IncomeKind;
  description?: string | null;
  date?: string;
  month?: string;
  accountId?: number | null;
}

export interface IIncomeRepository {
  findByMonth(
    month: string,
    userId?: number,
    accountId?: number,
    period?: BudgetMonthPeriod
  ): Promise<IncomeEntry[]>;
  findById(id: number): Promise<IncomeEntry | null>;
  findAllByUserId(userId: number): Promise<IncomeEntry[]>;
  create(data: CreateIncomeInput): Promise<{ id: number }>;
  update(id: number, data: UpdateIncomeInput): Promise<void>;
  delete(id: number): Promise<void>;
  hasIncomeFromRecurring(recurringIncomeId: number, month: string): Promise<boolean>;
}
