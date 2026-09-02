import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { hasFeature } from "@/lib/features/access";
import { ReconService } from "@/lib/services/recon/recon.service";
import { featureDeniedResponse } from "@/lib/api/feature-gate";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  setRequestContextFromSession(session);
  const blocked = featureDeniedResponse("recon");
  if (blocked) {
    if (blocked.status === 403) {
      return NextResponse.json({ reconEnabled: false, items: [] });
    }
    return blocked;
  }
  const userId = Number(session.user.id);
  const service = new ReconService();
  const items = await service.listPendingItems(userId);
  return NextResponse.json({ reconEnabled: hasFeature("recon"), items });
}
