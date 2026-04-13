import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { requireSuperAdmin } from "@/lib/db/request-context";
import { AdminHouseholdRepository } from "@/lib/repositories/sql/admin-household.repository";

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
  const householdId = Number(params.id);
  if (!Number.isFinite(householdId)) {
    return NextResponse.json({ error: "Invalid household id" }, { status: 400 });
  }

  const body = await request.json();
  const aiFeatureAllowed = body?.aiFeatureAllowed === true;
  const reconFeatureAllowed = body?.reconFeatureAllowed === true;

  const repo = new AdminHouseholdRepository();
  await repo.updateFeaturePolicy(householdId, { aiFeatureAllowed, reconFeatureAllowed });
  return NextResponse.json({ success: true });
}

