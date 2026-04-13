import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { getUserRepository } from "@/lib/repositories";
import { ReconService } from "@/lib/services/recon/recon.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  setRequestContextFromSession(session);
  const userId = Number(session.user.id);
  const userRepo = getUserRepository();
  const [reconFeatureAllowed, reconEnabledPref] = await Promise.all([
    userRepo.getReconFeatureAllowed(userId),
    userRepo.getReconEnabled(userId),
  ]);
  const reconEnabled = reconFeatureAllowed && reconEnabledPref;
  if (!reconEnabled) {
    return NextResponse.json({ reconEnabled: false, items: [] });
  }
  const service = new ReconService();
  const items = await service.listPendingItems(userId);
  return NextResponse.json({ reconEnabled: true, items });
}
