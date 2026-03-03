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
  return NextResponse.json(schedule);
}
