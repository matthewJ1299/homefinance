import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContext } from "@/lib/db/request-context";
import { reconDisabledResponse } from "@/lib/api/recon-enabled";
import { ReconService } from "@/lib/services/recon/recon.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  setRequestContext({ userId: session.user.id, userName: session.user.name ?? undefined });
  const userId = Number(session.user.id);
  const blocked = await reconDisabledResponse(userId);
  if (blocked) return blocked;
  const messageId = (await params).id;
  if (!messageId || typeof messageId !== "string") {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    const service = new ReconService();
    const msg = await service.getGraphMessageBody(userId, messageId);
    return NextResponse.json({ message: msg });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

