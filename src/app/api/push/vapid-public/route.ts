import { NextResponse } from "next/server";

/**
 * Returns the VAPID public key for the client to subscribe to push.
 * No auth required; the key is public. Subscription is tied to the user when they POST /api/push/subscribe.
 */
export async function GET() {
  const publicKey = (process.env.VAPID_PUBLIC_KEY ?? "").trim();
  if (!publicKey) {
    return NextResponse.json(
      { error: "Push notifications are not configured (missing VAPID_PUBLIC_KEY)" },
      { status: 503 }
    );
  }
  return NextResponse.json({ publicKey });
}
