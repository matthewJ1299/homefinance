import type { BudgetMonthPeriod } from "@/lib/types/budget-month";

export interface CreateTransferInput {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  note?: string | null;
}

export interface Transfer {
  id: number;
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  note: string | null;
  createdAt: string;
}

export interface ITransferRepository {
  create(input: CreateTransferInput): Promise<{ id: number }>;
  findById(id: number): Promise<Transfer | null>;
  findByAccount(
    accountId: number,
    limit: number,
    offset: number
  ): Promise<Transfer[]>;
  /**
   * Every household transfer recorded inside the period (creation date in app
   * time; a transfer has no other date), oldest first. Household export only.
   */
  findInPeriodForHousehold(period: BudgetMonthPeriod): Promise<Transfer[]>;
}

