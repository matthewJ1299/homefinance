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
  // Keyed by user id rather than shaped as userA/userB: a bond can have any
  // number of people on it, and two named slots dropped the rest.
  const history = schedule.schedule.map((row) => ({
    month: row.month,
    equityPctByUserId: row.equityPctByUserId,
  }));
  const lastRow = schedule.schedule[schedule.schedule.length - 1];
  return NextResponse.json({
    currentMonth: lastRow?.month ?? 0,
    people: schedule.equitySummary.people.map((p) => ({
      userId: p.userId,
      name: p.name,
      deposit: p.deposit,
      totalPaid: p.totalPayments,
      equityPct: p.equityPct,
    })),
    history,
  });
}
