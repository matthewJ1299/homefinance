import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContext } from "@/lib/db/request-context";
import { getPushSubscriptionRepository } from "@/lib/repositories";
import { isNotificationConfigured } from "@/lib/services/notification.service";
import { pushServerLog, vapidPublicKeyFingerprint } from "@/lib/push/push-server-log";

/**
 * Returns whether the current user has server-side push subscriptions and VAPID fingerprint hints.
 * Used by Settings to reconcile browser vs server state after Android/PWA resume.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  setRequestContext({
    userId: session.user.id,
    userName: session.user.name ?? undefined,
  });

  const userId = Number(session.user.id);
  const repo = getPushSubscriptionRepository();
  const subscriptions = await repo.findByUserId(userId);
  const fingerprint = vapidPublicKeyFingerprint();

  pushServerLog("status", {
    userId,
    subscriptionCount: subscriptions.length,
    pushConfigured: isNotificationConfigured(),
    vapidPublicKeyEndsWith: fingerprint.publicKeyEndsWith,
  });

  return NextResponse.json({
    hasServerSubscription: subscriptions.length > 0,
    subscriptionCount: subscriptions.length,
    pushConfigured: isNotificationConfigured(),
    vapidPublicKeyEndsWith: fingerprint.publicKeyEndsWith,
  });
}
