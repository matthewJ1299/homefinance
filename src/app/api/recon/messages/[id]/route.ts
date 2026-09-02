import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { featureDeniedResponse } from "@/lib/api/feature-gate";
import { ReconService } from "@/lib/services/recon/recon.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  setRequestContextFromSession(session);
  const userId = Number(session.user.id);
  const blocked = featureDeniedResponse("recon");
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

