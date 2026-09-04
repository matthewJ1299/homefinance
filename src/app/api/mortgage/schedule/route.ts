import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { featureDeniedResponse } from "@/lib/api/feature-gate";
import { MortgageService } from "@/lib/services/mortgage.service";

export async function GET() {
  const session = await auth();
  setRequestContextFromSession(session);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const blocked = featureDeniedResponse("mortgage");
  if (blocked) return blocked;
  const service = new MortgageService();
  const schedule = await service.getSchedule();
  if (!schedule) {
    return NextResponse.json({ error: "No mortgage configured" }, { status: 404 });
  }
  return NextResponse.json(schedule);
}
