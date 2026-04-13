import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { requireSuperAdmin } from "@/lib/db/request-context";
import { AdminUserRepository } from "@/lib/repositories/sql/admin-user.repository";

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  setRequestContextFromSession(session);
  try {
    requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = await ctx.params;
  const userId = Number(params.id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const body = await request.json();
  const repo = new AdminUserRepository();

  if (body?.isSuperAdmin !== undefined) {
    await repo.setUserSuperAdmin(userId, body.isSuperAdmin === true);
  }
  if (body?.aiFeatureAllowed !== undefined || body?.reconFeatureAllowed !== undefined) {
    await repo.setUserFeatureAccess(userId, {
      aiFeatureAllowed: body?.aiFeatureAllowed === true,
      reconFeatureAllowed: body?.reconFeatureAllowed === true,
    });
  }

  return NextResponse.json({ success: true });
}

