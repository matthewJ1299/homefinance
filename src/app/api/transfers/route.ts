import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { TransferService } from "@/lib/services/transfer.service";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = Number(session.user.id);
  const body = await request.json();
  const { fromAccountId, toAccountId, amount, note } = body ?? {};

  if (
    !Number.isInteger(fromAccountId) ||
    !Number.isInteger(toAccountId) ||
    typeof amount !== "number"
  ) {
    return NextResponse.json(
      { error: "Invalid input" },
      { status: 400 }
    );
  }

  const service = new TransferService();
  try {
    await service.transferBetweenAccounts(userId, {
      fromAccountId,
      toAccountId,
      amount,
      note: note ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}

