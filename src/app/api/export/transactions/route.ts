import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContext } from "@/lib/db/request-context";
import { TransactionExportService } from "@/lib/services/transaction-export.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  setRequestContext({ userId: session.user.id, userName: session.user.name ?? undefined });
  const userId = Number(session.user.id);
  const service = new TransactionExportService();
  const csv = await service.buildCsvForUser(userId);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `homefinance-transactions-${stamp}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
