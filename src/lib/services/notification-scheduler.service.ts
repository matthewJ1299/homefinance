import cron from "node-cron";
import { format, parseISO, subMinutes, addDays } from "date-fns";
import { CalendarService } from "@/lib/services/calendar.service";
import { NotificationService, isNotificationConfigured } from "@/lib/services/notification.service";
import { getSentReminderRepository } from "@/lib/repositories";
import { formatEventLine } from "@/lib/utils/format-time";
import type { CalendarEventOccurrence } from "@/lib/services/calendar.service";

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
    const occurrences = await calendarService.getByDateRange(today, today);
    if (occurrences.length === 0) return;
    const title = "HomeFinance";
    const body =
      occurrences.length === 1
        ? `You have an upcoming event: ${formatEventLine(occurrences[0].name, occurrences[0].time)}.`
        : `You have upcoming events: ${occurrences.map((o) => formatEventLine(o.name, o.time)).join("; ")}.`;
    const notificationService = new NotificationService();
    await notificationService.sendToAll(
      { title, body, url: "/calendar" },
      { ttl: 86400 }
    );
  } catch (err) {
    console.error("[NotificationScheduler] Daily summary failed:", err);
  }
}

/**
 * For a timed occurrence, compute the reminder time (occurrence time minus reminder_minutes).
 * Returns null if occurrence has no time or no reminder.
 */
function getReminderTime(occ: CalendarEventOccurrence): { date: string; time: string } | null {
  if (occ.reminderMinutes == null || occ.time == null || !occ.time.trim()) return null;
  try {
    const occurrenceDt = parseISO(`${occ.date}T${occ.time}`);
    const reminderDt = subMinutes(occurrenceDt, occ.reminderMinutes);
    return {
      date: format(reminderDt, "yyyy-MM-dd"),
      time: format(reminderDt, "HH:mm"),
    };
  } catch {
    return null;
  }
}

/**
 * Every minute: find occurrences whose reminder time is "now" and send push (and mark sent).
 */
async function runPerEventReminders(): Promise<void> {
  if (!isNotificationConfigured()) return;
  try {
    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");
    const tomorrowStr = format(addDays(now, 1), "yyyy-MM-dd");
    const minuteStr = format(now, "HH:mm");
    const calendarService = new CalendarService();
    const sentReminderRepo = getSentReminderRepository();
    const occurrences = await calendarService.getByDateRange(todayStr, tomorrowStr);
    for (const occ of occurrences) {
      const reminder = getReminderTime(occ);
      if (!reminder || reminder.time !== minuteStr) continue;
      if (reminder.date !== todayStr && reminder.date !== tomorrowStr) continue;
      const alreadySent = await sentReminderRepo.hasBeenSent(occ.eventId, occ.date);
      if (alreadySent) continue;
      const title = "HomeFinance";
      const body = `Reminder: ${formatEventLine(occ.name, occ.time)}`;
      const notificationService = new NotificationService();
      await notificationService.sendToAll(
        { title, body, url: "/calendar" },
        { ttl: 3600 }
      );
      await sentReminderRepo.markSent(occ.eventId, occ.date);
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
