import type { RecurringIncome } from "@/lib/types";
import type { IncomeType } from "@/lib/types";

export interface IRecurringIncomeRepository {
  findAll(): Promise<RecurringIncome[]>;
  findByUserId(userId: number): Promise<RecurringIncome[]>;
  findById(id: number): Promise<RecurringIncome | null>;
  create(data: {
    userId: number;
    amount: number;
    type: IncomeType;
    description?: string | null;
    dayOfMonth: number;
  }): Promise<RecurringIncome>;
  update(
    id: number,
    data: {
      amount?: number;
      type?: IncomeType;
      description?: string | null;
      dayOfMonth?: number;
    }
  ): Promise<void>;
  delete(id: number): Promise<void>;
}
