import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { GoalService } from "@/lib/services/goal.service";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "true";
  const service = new GoalService();
  const goals = await service.listGoals(userId, includeArchived);
  return NextResponse.json({ goals });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const body = await request.json();
  const { name, type, targetAmount, monthlyTarget, linkedAccountId, apr, strategy } = body ?? {};

  try {
    const service = new GoalService();
    const goal = await service.createGoal(userId, {
      name,
      type,
      targetAmount: targetAmount ?? null,
      monthlyTarget,
      linkedAccountId: linkedAccountId ?? null,
      apr: apr ?? null,
      strategy: strategy ?? null,
    });
    return NextResponse.json({ goal }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

