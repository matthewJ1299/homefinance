import { eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { splitAllocations, users, expenses } from "@/lib/db/schema";
import type {
  ISplitAllocationRepository,
  SplitAllocationWithUser,
  SplitAllocationBalanceRow,
} from "../interfaces/split-allocation.repository";

export class SplitAllocationRepository implements ISplitAllocationRepository {
  async create(expenseId: number, userId: number, amount: number): Promise<{ id: number }> {
    const [inserted] = await db
      .insert(splitAllocations)
      .values({ expenseId, userId, amount })
      .returning({ id: splitAllocations.id });
    return { id: inserted!.id };
  }

  async findByExpenseId(expenseId: number): Promise<SplitAllocationWithUser[]> {
    const rows = await db
      .select({
        id: splitAllocations.id,
        expenseId: splitAllocations.expenseId,
        userId: splitAllocations.userId,
        amount: splitAllocations.amount,
        userName: users.name,
      })
      .from(splitAllocations)
      .innerJoin(users, eq(splitAllocations.userId, users.id))
      .where(eq(splitAllocations.expenseId, expenseId));
    return rows as SplitAllocationWithUser[];
  }

  async findAllForBalance(): Promise<SplitAllocationBalanceRow[]> {
    const rows = await db
      .select({
        amount: splitAllocations.amount,
        paidByUserId: expenses.paidByUserId,
        allocationUserId: splitAllocations.userId,
      })
      .from(splitAllocations)
      .innerJoin(expenses, eq(splitAllocations.expenseId, expenses.id))
      .where(isNotNull(expenses.paidByUserId));
    const withNames: SplitAllocationBalanceRow[] = [];
    for (const r of rows) {
      if (r.paidByUserId == null) continue;
      const [payer] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, r.paidByUserId))
        .limit(1);
      const [allocUser] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, r.allocationUserId))
        .limit(1);
      withNames.push({
        amount: r.amount,
        paidByUserId: r.paidByUserId,
        paidByUserName: payer?.name ?? "?",
        allocationUserId: r.allocationUserId,
        allocationUserName: allocUser?.name ?? "?",
      });
    }
    return withNames;
  }

  async deleteByExpenseId(expenseId: number): Promise<void> {
    await db.delete(splitAllocations).where(eq(splitAllocations.expenseId, expenseId));
  }
}
