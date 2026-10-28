import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ExpenseService } from "@/lib/services/expense.service";
import { updateExpenseSchema } from "@/lib/validators/expense.schema";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { getExpenseRepository } from "@/lib/repositories";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  setRequestContextFromSession(session);
  const id = Number((await params).id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const repo = getExpenseRepository();
  const expense = await repo.findById(id);
  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }
  if (expense.userId !== Number(session.user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ expense });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  setRequestContextFromSession(session);
  const id = Number((await params).id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const body = await request.json();
  const parsed = updateExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const userId = Number(session.user.id);
  const service = new ExpenseService();
  await service.update(id, userId, parsed.data);
  return new NextResponse(null, { status: 204 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  setRequestContextFromSession(session);
  const id = Number((await params).id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const service = new ExpenseService();
  await service.delete(id);
  return new NextResponse(null, { status: 204 });
}
