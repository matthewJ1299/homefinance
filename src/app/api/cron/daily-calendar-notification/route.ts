import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import webpush from "web-push";
import { CalendarService } from "@/lib/services/calendar.service";
import { getPushSubscriptionRepository, getUserRepository } from "@/lib/repositories";
import { formatEventLine } from "@/lib/utils/format-time";

/**
 * Sends a push notification at 10am (when invoked by a cron) to all users with
 * push subscriptions if there is at least one calendar event today. The notification
 * states that there is an upcoming event and lists name and time for each.
 *
 * Call with: Authorization: Bearer <CRON_SECRET> or x-cron-secret: <CRON_SECRET>
 * Schedule the request for 10am daily in your timezone (e.g. cron: 0 10 * * * with TZ set).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const headerSecret = request.headers.get("x-cron-secret");
    const provided = bearer ?? headerSecret ?? null;
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

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

  const today = format(new Date(), "yyyy-MM-dd");
  const calendarService = new CalendarService();
  const occurrences = await calendarService.getByDateRange(today, today);

  if (occurrences.length === 0) {
    return NextResponse.json({ sent: 0, reason: "no_events", date: today });
  }

  const title = "HomeFinance";
  const body =
    occurrences.length === 1
      ? `You have an upcoming event: ${formatEventLine(occurrences[0].name, occurrences[0].time)}.`
      : `You have upcoming events: ${occurrences.map((o) => formatEventLine(o.name, o.time)).join("; ")}.`;
  const url = "/calendar";

  const payload = JSON.stringify({ title, body, url });

  const pushRepo = getPushSubscriptionRepository();
  const userRepo = getUserRepository();
  const users = await userRepo.findAll();

  let sent = 0;
  const errors: string[] = [];

  for (const user of users) {
    const subscriptions = await pushRepo.findByUserId(user.id);
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 86400 }
        );
        sent++;
      } catch (e) {
        errors.push((e as Error).message ?? "Unknown");
      }
    }
  }

  return NextResponse.json({
    sent,
    date: today,
    eventsCount: occurrences.length,
    usersNotified: users.length,
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
  });
}
