import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { income, users } from "@/lib/db/schema";
import type { IncomeEntry } from "../interfaces/income.repository";
import type {
  IIncomeRepository,
  CreateIncomeInput,
  UpdateIncomeInput,
} from "../interfaces/income.repository";

export class IncomeRepository implements IIncomeRepository {
  async findByMonth(month: string, userId?: number): Promise<IncomeEntry[]> {
    const monthEq = eq(income.month, month);
    const where = userId != null ? and(monthEq, eq(income.userId, userId)) : monthEq;
    const rows = await db
      .select({
        id: income.id,
        userId: income.userId,
        userName: users.name,
        amount: income.amount,
        type: income.type,
        description: income.description,
        date: income.date,
      })
      .from(income)
      .innerJoin(users, eq(income.userId, users.id))
      .where(where)
      .orderBy(income.date);
    return rows as IncomeEntry[];
  }

  async findById(id: number): Promise<IncomeEntry | null> {
    const [row] = await db
      .select({
        id: income.id,
        userId: income.userId,
        userName: users.name,
        amount: income.amount,
        type: income.type,
        description: income.description,
        date: income.date,
      })
      .from(income)
      .innerJoin(users, eq(income.userId, users.id))
      .where(eq(income.id, id))
      .limit(1);
    return (row as IncomeEntry) ?? null;
  }

  async create(data: CreateIncomeInput): Promise<{ id: number }> {
    const [inserted] = await db
      .insert(income)
      .values({
        userId: data.userId,
        amount: data.amount,
        type: data.type,
        description: data.description ?? null,
        date: data.date,
        month: data.month,
      })
      .returning({ id: income.id });
    return { id: inserted!.id };
  }

  async update(id: number, data: UpdateIncomeInput): Promise<void> {
    await db
      .update(income)
      .set({
        ...(data.amount != null && { amount: data.amount }),
        ...(data.type != null && { type: data.type }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.date != null && { date: data.date }),
        ...(data.month != null && { month: data.month }),
      })
      .where(eq(income.id, id));
  }

  async delete(id: number): Promise<void> {
    await db.delete(income).where(eq(income.id, id));
  }
}
