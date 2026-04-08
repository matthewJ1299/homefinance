import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContext } from "@/lib/db/request-context";
import { getUserRepository } from "@/lib/repositories";
import { ReconService } from "@/lib/services/recon/recon.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  setRequestContext({ userId: session.user.id, userName: session.user.name ?? undefined });
  const userId = Number(session.user.id);
  const reconEnabled = await getUserRepository().getReconEnabled(userId);
  if (!reconEnabled) {
    return NextResponse.json({ reconEnabled: false, items: [] });
  }
  const service = new ReconService();
  const items = await service.listPendingItems(userId);
  return NextResponse.json({ reconEnabled: true, items });
}
