import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { getPushSubscriptionRepository } from "@/lib/repositories";
import { pushUnsubscribeBodySchema } from "@/lib/validators/push-subscription.schema";

/**
 * Remove the current user's push subscription for the given endpoint.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  setRequestContextFromSession(session);

  const body = await request.json();
  const parsed = pushUnsubscribeBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const repo = getPushSubscriptionRepository();
  await repo.deleteByEndpointAndUserId(parsed.data.endpoint, Number(session.user.id));
  return NextResponse.json({ ok: true });
}
