import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MortgageService } from "@/lib/services/mortgage.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const service = new MortgageService();
  const schedule = await service.getSchedule();
  if (!schedule) {
    return NextResponse.json({ error: "No mortgage configured" }, { status: 404 });
  }
  const history = schedule.schedule.map((row) => ({
    month: row.month,
    userAEquityPct: row.userACumulativeEquityPct,
    userBEquityPct: row.userBCumulativeEquityPct,
  }));
  const lastRow = schedule.schedule[schedule.schedule.length - 1];
  return NextResponse.json({
    currentMonth: lastRow?.month ?? 0,
    userA: {
      deposit: schedule.equitySummary.userA.deposit,
      totalPaid: schedule.equitySummary.userA.totalPayments,
      equityPct: schedule.equitySummary.userA.equityPct,
    },
    userB: {
      deposit: schedule.equitySummary.userB.deposit,
      totalPaid: schedule.equitySummary.userB.totalPayments,
      equityPct: schedule.equitySummary.userB.equityPct,
    },
    history,
  });
}
