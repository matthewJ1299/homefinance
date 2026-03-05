import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { BudgetService } from "@/lib/services/budget.service";
import { getCurrentMonth } from "@/lib/utils/date";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const month = request.nextUrl.searchParams.get("month") ?? getCurrentMonth();
  const userId = Number(session.user.id);
  const service = new BudgetService();
  const overview = await service.getOverview(month, userId);
  return NextResponse.json(overview);
}
