import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContext } from "@/lib/db/request-context";
import { getPushSubscriptionRepository } from "@/lib/repositories";
import { NotificationService, isNotificationConfigured } from "@/lib/services/notification.service";

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

  if (!isNotificationConfigured()) {
    return NextResponse.json(
      { error: "Push not configured (VAPID keys missing)" },
      { status: 503 }
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

  const pushRepo = getPushSubscriptionRepository();
  const userId = Number(session.user.id);
  const subscriptions = await pushRepo.findByUserId(userId);
  if (subscriptions.length === 0) {
    return NextResponse.json(
      { error: "No push subscriptions for this user" },
      { status: 404 }
    );
  }

  const notificationService = new NotificationService();
  const result = await notificationService.sendToUser(userId, { title, body, url });

  if (result.badJwtToken) {
    return NextResponse.json(
      {
        error:
          "Your notification subscription is out of date. Disable notifications below, then enable them again and try sending a test.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    sent: result.sent,
    failed: result.failed,
    ...(result.failed > 0 ? { errors: ["Some subscriptions failed or were stale"] } : {}),
  });
}
