import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { GoalService } from "@/lib/services/goal.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await auth();
  setRequestContextFromSession(session);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const { id } = await context.params;
  const goalId = Number(id);
  if (!Number.isFinite(goalId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const service = new GoalService();
  const goal = await service.getGoal(userId, goalId);
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ goal });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth();
  setRequestContextFromSession(session);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const { id } = await context.params;
  const goalId = Number(id);
  if (!Number.isFinite(goalId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await request.json();
  const { name, targetAmount, monthlyTarget, linkedAccountId, apr, strategy, archivedAt } = body ?? {};

  try {
    const service = new GoalService();
    await service.updateGoal(userId, goalId, {
      name,
      targetAmount,
      monthlyTarget,
      linkedAccountId,
      apr,
      strategy,
      archivedAt,
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await auth();
  setRequestContextFromSession(session);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const { id } = await context.params;
  const goalId = Number(id);
  if (!Number.isFinite(goalId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const service = new GoalService();
  await service.deleteGoal(userId, goalId);
  return NextResponse.json({ success: true });
}

