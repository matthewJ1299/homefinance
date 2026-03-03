import type { IncomeType } from "@/lib/types";

export interface IncomeEntry {
  id: number;
  userId: number;
  userName: string;
  amount: number;
  type: IncomeType;
  description: string | null;
  date: string;
}

export interface CreateIncomeInput {
  userId: number;
  amount: number;
  type: IncomeType;
  description?: string | null;
  date: string;
  month: string;
}

export interface UpdateIncomeInput {
  amount?: number;
  type?: IncomeType;
  description?: string | null;
  date?: string;
  month?: string;
}

export interface IIncomeRepository {
  findByMonth(month: string, userId?: number): Promise<IncomeEntry[]>;
  findById(id: number): Promise<IncomeEntry | null>;
  create(data: CreateIncomeInput): Promise<{ id: number }>;
  update(id: number, data: UpdateIncomeInput): Promise<void>;
  delete(id: number): Promise<void>;
}
