import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContext } from "@/lib/db/request-context";
import { ExpenseService } from "@/lib/services/expense.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  setRequestContext({ userId: session.user.id, userName: session.user.name ?? undefined });
  const userId = Number(session.user.id);

  const service = new ExpenseService();
  const counts = await service.getUsageCountsByCategory(userId);
  return NextResponse.json({ counts });
}

