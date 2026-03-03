import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ExpenseService } from "@/lib/services/expense.service";
import { createExpenseSchema } from "@/lib/validators/expense.schema";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const entries = body.entries as Array<{
    tempId: string;
    categoryId: number;
    amount: number;
    note?: string;
    date: string;
  }>;
  if (!Array.isArray(entries)) {
    return NextResponse.json({ error: "entries array required" }, { status: 400 });
  }
  const userId = Number(session.user.id);
  const service = new ExpenseService();
  const synced: Array<{ tempId: string; serverId: number }> = [];
  for (const entry of entries) {
    const parsed = createExpenseSchema.safeParse({
      categoryId: entry.categoryId,
      amount: entry.amount,
      note: entry.note,
      date: entry.date,
    });
    if (!parsed.success) continue;
    const { id } = await service.create(userId, parsed.data);
    synced.push({ tempId: entry.tempId, serverId: id });
  }
  return NextResponse.json({ synced });
}
