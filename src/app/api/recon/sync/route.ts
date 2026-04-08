import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContext } from "@/lib/db/request-context";
import { reconDisabledResponse } from "@/lib/api/recon-enabled";
import { ReconService } from "@/lib/services/recon/recon.service";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  setRequestContext({ userId: session.user.id, userName: session.user.name ?? undefined });
  const userId = Number(session.user.id);
  const blocked = await reconDisabledResponse(userId);
  if (blocked) return blocked;
  try {
    const body = (await request.json().catch(() => ({}))) as { since?: string; debug?: boolean; top?: number; skip?: number };
    const since = typeof body.since === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.since) ? body.since : undefined;
    const debug = body.debug === true;
    const topRaw = typeof body.top === "number" ? body.top : Number.NaN;
    const top = Number.isFinite(topRaw) ? Math.floor(topRaw) : undefined;
    const safeTop = top != null && top > 0 ? Math.min(top, 1000) : undefined;
    const skipRaw = typeof body.skip === "number" ? body.skip : Number.NaN;
    const skip = Number.isFinite(skipRaw) ? Math.max(0, Math.min(Math.floor(skipRaw), 10_000)) : undefined;
    const service = new ReconService();
    const result = await service.syncFromGraph(userId, since, debug, safeTop, skip);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "sync_failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
