import { getIncomeRepository } from "@/lib/repositories";
import { monthFromDate } from "@/lib/utils/date";
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
  constructor(private repo = getIncomeRepository()) {}

  async getByMonth(month: string, userId?: number): Promise<IncomeByMonthResult> {
    const entries = await this.repo.findByMonth(month, userId);
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
    data: { amount: number; type: IncomeType; description?: string | null; date: string }
  ): Promise<{ id: number }> {
    const month = monthFromDate(data.date);
    return this.repo.create({
      userId,
      amount: data.amount,
      type: data.type,
      description: data.description,
      date: data.date,
      month,
    });
  }

  async update(
    id: number,
    data: { amount?: number; type?: IncomeType; description?: string | null; date?: string }
  ): Promise<void> {
    const payload: { amount?: number; type?: IncomeType; description?: string | null; date?: string; month?: string } = { ...data };
    if (data.date) payload.month = monthFromDate(data.date);
    await this.repo.update(id, payload);
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
