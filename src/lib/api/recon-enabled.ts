import { NextResponse } from "next/server";
import { getUserRepository } from "@/lib/repositories";

/**
 * Returns a 403 JSON response when Recon is off in Settings, otherwise null.
 */
export async function reconDisabledResponse(userId: number): Promise<NextResponse | null> {
  const enabled = await getUserRepository().getReconEnabled(userId);
  if (enabled) return null;
  return NextResponse.json(
    {
      error:
        "Bank email reconciliation (Recon) is turned off. Enable it under Settings to use Outlook sync and this API.",
    },
    { status: 403 }
  );
}
