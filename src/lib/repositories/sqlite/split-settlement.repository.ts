import { eq, or } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "@/lib/db";
import { splitSettlements, users } from "@/lib/db/schema";
import type {
  ISplitSettlementRepository,
  SplitSettlementRow,
  SplitSettlementWithNames,
} from "../interfaces/split-settlement.repository";

const payerUser = alias(users, "payer");
const recipientUser = alias(users, "recipient");

export class SplitSettlementRepository implements ISplitSettlementRepository {
  async create(data: {
    payerUserId: number;
    recipientUserId: number;
    amount: number;
    date: string;
    expenseId?: number | null;
    incomeId?: number | null;
  }): Promise<{ id: number }> {
    const [inserted] = await db
      .insert(splitSettlements)
      .values({
        payerUserId: data.payerUserId,
        recipientUserId: data.recipientUserId,
        amount: data.amount,
        date: data.date,
        expenseId: data.expenseId ?? null,
        incomeId: data.incomeId ?? null,
      })
      .returning({ id: splitSettlements.id });
    return { id: inserted!.id };
  }

  async findAllForUser(userId: number): Promise<SplitSettlementWithNames[]> {
    const rows = await db
      .select({
        id: splitSettlements.id,
        payerUserId: splitSettlements.payerUserId,
        recipientUserId: splitSettlements.recipientUserId,
        amount: splitSettlements.amount,
        date: splitSettlements.date,
        expenseId: splitSettlements.expenseId,
        incomeId: splitSettlements.incomeId,
        payerUserName: payerUser.name,
        recipientUserName: recipientUser.name,
      })
      .from(splitSettlements)
      .innerJoin(payerUser, eq(splitSettlements.payerUserId, payerUser.id))
      .innerJoin(recipientUser, eq(splitSettlements.recipientUserId, recipientUser.id))
      .where(
        or(
          eq(splitSettlements.payerUserId, userId),
          eq(splitSettlements.recipientUserId, userId)
        )
      );

    return rows.map((r) => ({
      id: r.id,
      payerUserId: r.payerUserId,
      recipientUserId: r.recipientUserId,
      amount: r.amount,
      date: r.date,
      expenseId: r.expenseId,
      incomeId: r.incomeId,
      payerUserName: r.payerUserName,
      recipientUserName: r.recipientUserName,
    })) as SplitSettlementWithNames[];
  }

  async findByExpenseId(expenseId: number): Promise<SplitSettlementRow | null> {
    const [row] = await db
      .select()
      .from(splitSettlements)
      .where(eq(splitSettlements.expenseId, expenseId))
      .limit(1);
    return row ?? null;
  }

  async delete(id: number): Promise<void> {
    await db.delete(splitSettlements).where(eq(splitSettlements.id, id));
  }
}
