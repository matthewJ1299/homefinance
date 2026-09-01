import cron from "node-cron";
import { format, addDays } from "date-fns";
import { CalendarService } from "@/lib/services/calendar.service";
import { NotificationService, isNotificationConfigured } from "@/lib/services/notification.service";
import { getSentReminderRepository, getUserRepository } from "@/lib/repositories";
import { formatEventLine } from "@/lib/utils/format-time";
import { computeReminderInstant, REMINDER_LOOKAHEAD_DAYS } from "@/lib/utils/reminder-time";

const DEFAULT_DAILY_HOUR = 9;
const TIMEZONE = process.env.TZ ?? "UTC";

function getDailyHour(): number {
  const h = process.env.DAILY_NOTIFICATION_HOUR;
  if (h == null || h === "") return DEFAULT_DAILY_HOUR;
  const n = parseInt(h, 10);
  return Number.isNaN(n) ? DEFAULT_DAILY_HOUR : Math.max(0, Math.min(23, n));
}

/**
 * Runs the same logic as GET /api/cron/daily-calendar-notification: today's events summary to all users.
 */
async function runDailySummary(): Promise<void> {
  if (!isNotificationConfigured()) return;
  try {
    const today = format(new Date(), "yyyy-MM-dd");
    const calendarService = new CalendarService();
    const userRepo = getUserRepository();
    const users = await userRepo.findAll();
    const notificationService = new NotificationService();
    const title = "HomeFinance";
    for (const user of users) {
      const occurrences = await calendarService.getByDateRange(today, today, user.id);
      if (occurrences.length === 0) continue;
      const body =
        occurrences.length === 1
          ? `You have an upcoming event: ${formatEventLine(occurrences[0].name, occurrences[0].time)}.`
          : `You have upcoming events: ${occurrences.map((o) => formatEventLine(o.name, o.time)).join("; ")}.`;
      await notificationService.sendToUser(user.id, { title, body, url: "/calendar" }, { ttl: 86400 });
    }
  } catch (err) {
    console.error("[NotificationScheduler] Daily summary failed:", err);
  }
}

/**
 * Every minute: find event-occurrence reminders whose send instant is "now" and push them
 * (once per event/occurrence/reminder). The lookahead window must cover the largest
 * supported reminder offset so week-ahead reminders are found.
 */
async function runPerEventReminders(): Promise<void> {
  if (!isNotificationConfigured()) return;
  try {
    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");
    const endStr = format(addDays(now, REMINDER_LOOKAHEAD_DAYS), "yyyy-MM-dd");
    const minuteStr = format(now, "HH:mm");
    const calendarService = new CalendarService();
    const sentReminderRepo = getSentReminderRepository();
    const occurrences = await calendarService.getAllOccurrencesInRange(todayStr, endStr);
    for (const occ of occurrences) {
      for (const reminder of occ.reminders) {
        const instant = computeReminderInstant({
          eventDate: occ.date,
          eventTime: occ.time,
          offsetMinutes: reminder.offsetMinutes,
          sendTime: reminder.sendTime,
        });
        if (!instant || instant.date !== todayStr || instant.time !== minuteStr) continue;
        const alreadySent = await sentReminderRepo.hasBeenSent(occ.eventId, occ.date, reminder.id);
        if (alreadySent) continue;
        const title = "HomeFinance";
        const body = `Reminder: ${formatEventLine(occ.name, occ.time)}`;
        const notificationService = new NotificationService();
        if (occ.isShared) {
          await notificationService.sendToAll({ title, body, url: "/calendar" }, { ttl: 3600 });
        } else {
          await notificationService.sendToUser(
            occ.createdByUserId,
            { title, body, url: "/calendar" },
            { ttl: 3600 }
          );
        }
        await sentReminderRepo.markSent(occ.eventId, occ.date, reminder.id);
      }
    }
  } catch (err) {
    console.error("[NotificationScheduler] Per-event reminders failed:", err);
  }
}

/**
 * In-process scheduler for daily 9am summary and per-event reminders.
 * Start from instrumentation.ts after DB init.
 */
export class NotificationScheduler {
  private dailyTask: ReturnType<typeof cron.schedule> | null = null;
  private reminderTask: ReturnType<typeof cron.schedule> | null = null;

  start(): void {
    const dailyCron = `0 ${getDailyHour()} * * *`;
    this.dailyTask = cron.schedule(
      dailyCron,
      () => void runDailySummary(),
      { timezone: TIMEZONE }
    );
    this.reminderTask = cron.schedule(
      "* * * * *",
      () => void runPerEventReminders(),
      { timezone: TIMEZONE }
    );
  }

  stop(): void {
    if (this.dailyTask) {
      this.dailyTask.stop();
      this.dailyTask = null;
    }
    if (this.reminderTask) {
      this.reminderTask.stop();
      this.reminderTask = null;
    }
  }
}
