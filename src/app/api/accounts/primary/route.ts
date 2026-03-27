import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AccountService } from "@/lib/services/account.service";

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);
  const body = await request.json();
  const rawId = body?.accountId;
  const accountId = typeof rawId === "number" ? rawId : parseInt(String(rawId), 10);
  if (!Number.isInteger(accountId) || accountId <= 0) {
    return NextResponse.json({ error: "Invalid accountId" }, { status: 400 });
  }

  const service = new AccountService();
  try {
    await service.setPrimaryAccount(userId, accountId);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
