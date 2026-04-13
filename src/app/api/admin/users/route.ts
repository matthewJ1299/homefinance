import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { requireSuperAdmin } from "@/lib/db/request-context";
import { AdminUserRepository } from "@/lib/repositories/sql/admin-user.repository";
import { AdminHouseholdRepository } from "@/lib/repositories/sql/admin-household.repository";
import { AdminUserProvisioningService } from "@/lib/services/admin/admin-user-provisioning.service";

export async function GET(request: NextRequest) {
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

  const householdIdRaw = request.nextUrl.searchParams.get("householdId");
  const householdId =
    householdIdRaw != null && householdIdRaw !== "" ? Number(householdIdRaw) : undefined;
  if (householdIdRaw != null && householdIdRaw !== "" && !Number.isFinite(householdId)) {
    return NextResponse.json({ error: "Invalid householdId" }, { status: 400 });
  }

  const repo = new AdminUserRepository();
  const users = await repo.listUsers({ householdId });
  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
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

  const body = await request.json();
  const householdId = Number(body?.householdId);
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim();
  const password = String(body?.password ?? "").trim();

  if (!Number.isFinite(householdId) || !name || !email || !password) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const households = new AdminHouseholdRepository();
  const users = new AdminUserRepository();
  const svc = new AdminUserProvisioningService(households, users);
  const { userId } = await svc.createUserInHousehold({ householdId, name, email, password });
  return NextResponse.json({ userId }, { status: 201 });
}

