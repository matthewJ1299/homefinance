import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContext } from "@/lib/db/request-context";
import { pushServerLog, vapidPublicKeyFingerprint } from "@/lib/push/push-server-log";
import { getPushSubscriptionRepository } from "@/lib/repositories";
import { pushSubscriptionBodySchema } from "@/lib/validators/push-subscription.schema";

/**
 * Register a push subscription for the current user.
 * Replaces any existing subscription with the same endpoint.
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

  const body = await request.json();
  const parsed = pushSubscriptionBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid subscription", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const repo = getPushSubscriptionRepository();
  const userId = Number(session.user.id);
  const endpoint = parsed.data.endpoint;
  const fingerprint = vapidPublicKeyFingerprint();

  pushServerLog("subscribe", {
    userId,
    endpointPrefix: endpoint.slice(0, 60),
    vapidPublicKeyEndsWith: fingerprint.publicKeyEndsWith,
  });

  await repo.deleteByEndpoint(endpoint);
  await repo.create(userId, {
    endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
  });

  const subscriptions = await repo.findByUserId(userId);
  pushServerLog("subscribe-done", {
    userId,
    subscriptionCount: subscriptions.length,
  });

  return NextResponse.json({ ok: true });
}
