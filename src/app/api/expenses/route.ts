import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { initDb } from "@/lib/db";
import { ExpenseService } from "@/lib/services/expense.service";
import { createExpenseSchema } from "@/lib/validators/expense.schema";
import { getCurrentMonth } from "@/lib/utils/date";

export async function GET(request: NextRequest) {
  await initDb();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const month = request.nextUrl.searchParams.get("month") ?? getCurrentMonth();
  const service = new ExpenseService();
  const result = await service.getByMonth(month);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  await initDb();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const parsed = createExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const userId = Number(session.user.id);
  const service = new ExpenseService();
  const { id } = await service.create(userId, parsed.data);
  return NextResponse.json({ id });
}
