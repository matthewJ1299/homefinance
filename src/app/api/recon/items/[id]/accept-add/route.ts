import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { reconDisabledResponse } from "@/lib/api/recon-enabled";
import { ReconService } from "@/lib/services/recon/recon.service";
import { acceptAddSchema } from "@/lib/validators/recon.schema";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  setRequestContextFromSession(session);
  const userId = Number(session.user.id);
  const blocked = await reconDisabledResponse(userId);
  if (blocked) return blocked;
  const itemId = Number((await params).id);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const body = await request.json();
  const parsed = acceptAddSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const service = new ReconService();
    const result = await service.acceptAdd(
      userId,
      itemId,
      parsed.data.categoryId,
      parsed.data.accountId ?? null,
      parsed.data.split ?? false,
      parsed.data.note,
      parsed.data.amount
    );
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
