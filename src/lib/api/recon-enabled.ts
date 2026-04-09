import { NextResponse } from "next/server";
import { getUserRepository } from "@/lib/repositories";

/**
 * Returns a 403 JSON response when Recon is not allowed for this user or off in Settings, otherwise null.
 */
export async function reconDisabledResponse(userId: number): Promise<NextResponse | null> {
  const repo = getUserRepository();
  const [featureAllowed, preferenceOn] = await Promise.all([
    repo.getReconFeatureAllowed(userId),
    repo.getReconEnabled(userId),
  ]);
  if (!featureAllowed) {
    return NextResponse.json(
      {
        error:
          "Bank email reconciliation (Recon) is not enabled for your account. An administrator can grant access.",
      },
      { status: 403 }
    );
  }
  if (!preferenceOn) {
    return NextResponse.json(
      {
        error:
          "Bank email reconciliation (Recon) is turned off. Enable it under Settings to use Outlook sync and this API.",
      },
      { status: 403 }
    );
  }
  return null;
}
