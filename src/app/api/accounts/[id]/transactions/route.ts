import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import {
  getAccountRepository,
  getAccountTransactionRepository,
} from "@/lib/repositories";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  setRequestContextFromSession(session);
  const userId = Number(session.user.id);
  const accountId = Number((await params).id);
  if (!Number.isInteger(accountId) || accountId <= 0) {
    return NextResponse.json({ error: "Invalid account id" }, { status: 400 });
  }

  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "50");
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? "0");

  const accountRepo = getAccountRepository();
  const txRepo = getAccountTransactionRepository();

  const account = await accountRepo.findById(accountId, userId);
  if (!account) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const transactions = await txRepo.findByAccount(accountId, limit, offset);
  return NextResponse.json({ transactions });
}

