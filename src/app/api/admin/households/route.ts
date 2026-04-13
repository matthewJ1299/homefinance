import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { requireSuperAdmin } from "@/lib/db/request-context";
import { AdminHouseholdRepository } from "@/lib/repositories/sql/admin-household.repository";

export async function GET() {
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

  const repo = new AdminHouseholdRepository();
  const households = await repo.listHouseholds();
  return NextResponse.json({ households });
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
  const name = String(body?.name ?? "").trim();
  if (!name) {
    return NextResponse.json(
      { error: "Invalid input", issues: ["name is required"] },
      { status: 400 }
    );
  }

  const repo = new AdminHouseholdRepository();
  const id = await repo.createHousehold(name);
  return NextResponse.json({ id }, { status: 201 });
}

