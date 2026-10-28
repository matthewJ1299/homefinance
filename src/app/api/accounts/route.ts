import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { AccountService } from "@/lib/services/account.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  setRequestContextFromSession(session);
  const userId = Number(session.user.id);
  const service = new AccountService();
  const { accounts, primaryAccountId } = await service.listAccountsForUser(userId);
  return NextResponse.json({ accounts, primaryAccountId });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  setRequestContextFromSession(session);
  const userId = Number(session.user.id);
  const body = await request.json();
  const { name, type, creditLimit, isShared } = body ?? {};
  if (!name || !type) {
    return NextResponse.json(
      { error: "Invalid input", issues: ["name and type are required"] },
      { status: 400 }
    );
  }
  const service = new AccountService();
  const account = await service.createAccount(userId, {
    name,
    type,
    creditLimit: creditLimit ?? null,
    isShared: isShared === true,
  });
  return NextResponse.json(account, { status: 201 });
}

