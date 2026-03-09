import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { auth } from "@/lib/auth";
import { setRequestContext } from "@/lib/db/request-context";
import { getPushSubscriptionRepository } from "@/lib/repositories";

/**
 * Send a push notification to the current user's subscriptions.
 * Body: { title?: string, body?: string, url?: string }. Used for testing or server-triggered notifications.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  setRequestContext({
    userId: session.user.id,
    userName: session.user.name ?? undefined,
  });

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return NextResponse.json(
      { error: "Push not configured (VAPID keys missing)" },
      { status: 503 }
    );
  }

  webpush.setVapidDetails(
    "mailto:support@homefinance.local",
    publicKey,
    privateKey
  );

  const repo = getPushSubscriptionRepository();
  const userId = Number(session.user.id);
  const subscriptions = await repo.findByUserId(userId);
  if (subscriptions.length === 0) {
    return NextResponse.json(
      { error: "No push subscriptions for this user" },
      { status: 404 }
    );
  }

  let title = "HomeFinance";
  let body = "Test notification";
  let url = "/";
  try {
    const b = await request.json();
    if (b && typeof b === "object") {
      if (typeof b.title === "string") title = b.title;
      if (typeof b.body === "string") body = b.body;
      if (typeof b.url === "string") url = b.url;
    }
  } catch {
    // use defaults
  }

  const payload = JSON.stringify({ title, body, url });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
        { TTL: 60 }
      )
    )
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    return NextResponse.json({
      ok: true,
      sent: results.length - failed.length,
      failed: failed.length,
      errors: failed.map((r) => (r as PromiseRejectedResult).reason?.message ?? "Unknown"),
    });
  }
  return NextResponse.json({ ok: true, sent: results.length });
}
