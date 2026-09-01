import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { getDefaultBudgetMonthForUser } from "@/lib/utils/budget-month-for-user";
import { GoalProjectionService } from "@/lib/services/goal-projection.service";
import { GoalService } from "@/lib/services/goal.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await auth();
  setRequestContextFromSession(session);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const { id } = await context.params;
  const goalId = Number(id);
  if (!Number.isFinite(goalId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const goalService = new GoalService();
  const goal = await goalService.getGoal(userId, goalId);
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const projectionService = new GoalProjectionService();
  if (goal.type === "savings") {
    const month =
      request.nextUrl.searchParams.get("month") ?? (await getDefaultBudgetMonthForUser(userId));
    const progress = await projectionService.getSavingsProgress(userId, goalId, month);
    return NextResponse.json(progress);
  }

  const progress = await projectionService.getCreditProgress(userId, goalId);
  return NextResponse.json(progress);
}

