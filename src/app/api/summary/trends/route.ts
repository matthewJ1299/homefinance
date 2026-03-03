import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { SummaryService } from "@/lib/services/summary.service";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "from and to (YYYY-MM) required" }, { status: 400 });
  }
  const service = new SummaryService();
  const result = await service.getTrends(from, to);
  return NextResponse.json(result);
}
