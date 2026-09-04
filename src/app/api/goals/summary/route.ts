import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { featureDeniedResponse } from "@/lib/api/feature-gate";
import { getDefaultBudgetMonthForUser } from "@/lib/utils/budget-month-for-user";
import { GoalProjectionService } from "@/lib/services/goal-projection.service";

export async function GET(request: NextRequest) {
  const session = await auth();
  setRequestContextFromSession(session);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = featureDeniedResponse("goals");
  if (blocked) return blocked;
  const userId = Number(session.user.id);

  const month =
    request.nextUrl.searchParams.get("month") ?? (await getDefaultBudgetMonthForUser(userId));
  const service = new GoalProjectionService();
  const summary = await service.getDashboardSummary(userId, month);
  return NextResponse.json(summary);
}

