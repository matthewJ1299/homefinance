import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { featureDeniedResponse } from "@/lib/api/feature-gate";
import { GoalDetailService } from "@/lib/services/goal-detail.service";
import { getCurrentMonth } from "@/lib/utils/date";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await auth();
  setRequestContextFromSession(session);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = featureDeniedResponse("goals");
  if (blocked) return blocked;
  const userId = Number(session.user.id);

  const { id } = await context.params;
  const goalId = Number(id);
  if (!Number.isFinite(goalId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const month = request.nextUrl.searchParams.get("month") ?? getCurrentMonth();
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "50");
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? "0");

  try {
    const service = new GoalDetailService();
    const detail = await service.getDetail(userId, goalId, month, limit, offset);
    return NextResponse.json(detail);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load goal";
    if (message === "Goal not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
