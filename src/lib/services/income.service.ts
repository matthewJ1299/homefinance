import {
  getIncomeRepository,
  getAccountTransactionRepository,
} from "@/lib/repositories";
import { budgetMonthKeyForUser, getBudgetPeriodForUserMonth } from "@/lib/utils/budget-month-for-user";
import type { IncomeEntry } from "@/lib/repositories/interfaces/income.repository";
import type { IncomeType } from "@/lib/types";

export interface IncomeByMonthResult {
  entries: IncomeEntry[];
  totals: {
    overall: number;
    byUser: Record<number, number>;
    salary: number;
    adHoc: number;
  };
}

export class IncomeService {
  constructor(
    private repo = getIncomeRepository(),
    private accountTxRepo = getAccountTransactionRepository()
  ) {}

  async getByMonth(month: string, userId?: number, accountId?: number): Promise<IncomeByMonthResult> {
    const period = userId != null ? await getBudgetPeriodForUserMonth(month, userId) : undefined;
    const entries = await this.repo.findByMonth(month, userId, accountId, period);
    const totals = {
      overall: 0,
      byUser: {} as Record<number, number>,
      salary: 0,
      adHoc: 0,
    };
    for (const e of entries) {
      totals.overall += e.amount;
      totals.byUser[e.userId] = (totals.byUser[e.userId] ?? 0) + e.amount;
      if (e.type === "salary") totals.salary += e.amount;
      else totals.adHoc += e.amount;
    }
    return { entries, totals };
  }

  async create(
    userId: number,
    data: {
      amount: number;
      type: IncomeType;
      description?: string | null;
      date: string;
      accountId?: number;
    }
  ): Promise<{ id: number }> {
    const month = await budgetMonthKeyForUser(userId, data.date);
    const { id } = await this.repo.create({
      userId,
      amount: data.amount,
      type: data.type,
      description: data.description,
      date: data.date,
      month,
      accountId: data.accountId ?? null,
    });
    if (data.accountId != null) {
      await this.accountTxRepo.create({
        accountId: data.accountId,
        amount: data.amount,
        transactionType: "income",
        referenceType: "income",
        referenceId: id,
      });
    }
    return { id };
  }

  async update(
    id: number,
    userId: number,
    data: { amount?: number; type?: IncomeType; description?: string | null; date?: string }
  ): Promise<void> {
    const payload: { amount?: number; type?: IncomeType; description?: string | null; date?: string; month?: string } = { ...data };
    if (data.date) payload.month = await budgetMonthKeyForUser(userId, data.date);
    await this.repo.update(id, payload);
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
