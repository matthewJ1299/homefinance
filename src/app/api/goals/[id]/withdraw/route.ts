import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { featureDeniedResponse } from "@/lib/api/feature-gate";
import { GoalContributionService } from "@/lib/services/goal-contribution.service";
import { format } from "date-fns";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await auth();
  setRequestContextFromSession(session);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = featureDeniedResponse("goals");
  if (blocked) return blocked;
  const userId = Number(session.user.id);

  const { id } = await context.params;
  const goalId = Number(id);
  if (!Number.isFinite(goalId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await request.json();
  const { toAccountId, amount, effectiveDate, note } = body ?? {};

  try {
    const service = new GoalContributionService();
    const contribution = await service.withdrawFromSavingsGoal(userId, goalId, {
      toAccountId,
      amount,
      effectiveDate: effectiveDate ?? format(new Date(), "yyyy-MM-dd"),
      note: note ?? null,
    });
    return NextResponse.json({ contribution }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

