import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { CalendarService } from "@/lib/services/calendar.service";
import { NotificationService, isNotificationConfigured } from "@/lib/services/notification.service";
import { getUserRepository } from "@/lib/repositories";
import { formatEventLine } from "@/lib/utils/format-time";

/**
 * Sends a push notification at 9am (when invoked by a cron or in-process scheduler) to all users with
 * push subscriptions if there is at least one calendar event today. The notification
 * states that there is an upcoming event and lists name and time for each.
 *
 * Call with: Authorization: Bearer <CRON_SECRET> or x-cron-secret: <CRON_SECRET>
 * Schedule the request for 9am daily in your timezone (e.g. cron: 0 9 * * * with TZ set).
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

  if (!isNotificationConfigured()) {
    return NextResponse.json(
      { error: "Push not configured (VAPID keys missing)" },
      { status: 503 }
    );
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const calendarService = new CalendarService();
  const userRepo = getUserRepository();
  const users = await userRepo.findAll();
  const notificationService = new NotificationService();

  let sent = 0;
  let failed = 0;
  let usersNotified = 0;

  for (const user of users) {
    const occurrences = await calendarService.getByDateRange(today, today, user.id);
    if (occurrences.length === 0) continue;
    usersNotified++;
    const title = "HomeFinance";
    const body =
      occurrences.length === 1
        ? `You have an upcoming event: ${formatEventLine(occurrences[0].name, occurrences[0].time)}.`
        : `You have upcoming events: ${occurrences.map((o) => formatEventLine(o.name, o.time)).join("; ")}.`;
    const url = "/calendar";
    const r = await notificationService.sendToUser(user.id, { title, body, url }, { ttl: 86400 });
    sent += r.sent;
    failed += r.failed;
  }

  if (usersNotified === 0) {
    return NextResponse.json({ sent: 0, failed: 0, reason: "no_events", date: today });
  }

  return NextResponse.json({
    sent,
    failed,
    date: today,
    usersNotified,
    errors: failed > 0 ? ["Some subscriptions failed or were stale"] : undefined,
  });
}
