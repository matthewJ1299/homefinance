import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { BudgetService } from "@/lib/services/budget.service";
import { getDefaultBudgetMonthForUser } from "@/lib/utils/budget-month-for-user";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);
  const month =
    request.nextUrl.searchParams.get("month") ?? (await getDefaultBudgetMonthForUser(userId));
  const service = new BudgetService();
  const overview = await service.getOverview(month, userId);
  return NextResponse.json(overview);
}
