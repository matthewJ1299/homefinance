import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { HouseholdExportService } from "@/lib/services/household-export.service";

/**
 * One JSON file with the household's last three budget months, shaped for an
 * LLM to read. See docs/export.md.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  setRequestContextFromSession(session);
  const userId = Number(session.user.id);

  const { filename, data } = await new HouseholdExportService().buildForUser(userId);
  const body = JSON.stringify(data, null, 2);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
