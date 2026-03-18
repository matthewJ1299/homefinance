import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCurrentMonth } from "@/lib/utils/date";
import { GoalProjectionService } from "@/lib/services/goal-projection.service";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const month = request.nextUrl.searchParams.get("month") ?? getCurrentMonth();
  const service = new GoalProjectionService();
  const summary = await service.getDashboardSummary(userId, month);
  return NextResponse.json(summary);
}

