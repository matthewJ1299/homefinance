import cron from "node-cron";
import { addDays, format, parseISO } from "date-fns";
import { CalendarService } from "@/lib/services/calendar.service";
import { getHouseholdRepository, getSentReminderRepository, getUserRepository } from "@/lib/repositories";
import { runWithHouseholdFeatures } from "@/lib/features/run-with-household-features";
import { formatEventLine } from "@/lib/utils/format-time";
import {
  computeReminderDueInstant,
  eventStartInstant,
  REMINDER_LOOKAHEAD_DAYS,
  shouldSendReminderNow,
} from "@/lib/utils/reminder-time";
import { APP_TIME_ZONE, nowInAppTz } from "@/lib/utils/app-timezone";
import { withTryAdvisoryLock } from "@/lib/db/advisory-lock";

const DEFAULT_DAILY_HOUR = 9;

/**
 * Reminders due before this instant belong to the previous exact-minute matcher
 * and must not be replayed by the instant-based catch-up the first time it runs.
 * Anything due at or after it catches up normally -- fires late if a tick was
 * missed -- until its event starts. See `shouldSendReminderNow`.
 */
const REMINDER_CATCHUP_FLOOR = new Date("2026-09-21T00:00:00+02:00");

function getDailyHour(): number {
  const h = process.env.DAILY_NOTIFICATION_HOUR;
  if (h == null || h === "") return DEFAULT_DAILY_HOUR;
  const n = parseInt(h, 10);
  return Number.isNaN(n) ? DEFAULT_DAILY_HOUR : Math.max(0, Math.min(23, n));
}

/**
 * Runs the same logic as GET /api/cron/daily-calendar-notification: today's events summary
 * to every user. Iterates households and binds tenant request context per household so the
 * calendar/push repositories (which require household scope) resolve correctly.
 */
import { isPushEnvConfigured } from "@/lib/push/push-env";

/**
 * Every replica runs this scheduler, so without a lock N containers send N copies
 * of the same 9am summary. The per-event reminders below are protected by the
 * `sent_reminders` unique index; this one has no such guard, so the lock is it.
 *
 * A skipped tick is the correct outcome for the loser -- the winner is sending.
 */
async function runDailySummary(): Promise<void> {
  if (!isPushEnvConfigured()) return;
  const ran = await withTryAdvisoryLock("notification:daily-summary", () =>
    runDailySummaryInner()
  );
  if (!ran) {
    console.log("[NotificationScheduler] Daily summary already running elsewhere; skipped.");
  }
}

async function runDailySummaryInner(): Promise<void> {
  try {
    const today = nowInAppTz().date;
    const householdIds = await getHouseholdRepository().listAllHouseholdIds();
    for (const householdId of householdIds) {
      try {
        await runWithHouseholdFeatures(householdId, () => sendDailySummaryForHousehold(today));
      } catch (err) {
        console.error(
          `[NotificationScheduler] Daily summary failed for household ${householdId}:`,
          err
        );
      }
    }
  } catch (err) {
    console.error("[NotificationScheduler] Daily summary failed:", err);
  }
}

async function sendDailySummaryForHousehold(today: string): Promise<void> {
  const calendarService = new CalendarService();
  const users = await getUserRepository().findAll();
  const { NotificationService } = require("./notification.service") as typeof import("./notification.service");
  const notificationService = new NotificationService();
  const title = "HomeFinance";
  for (const user of users) {
    const occurrences = await calendarService.getByDateRange(today, today, user.id);
    if (occurrences.length === 0) continue;
    const body =
      occurrences.length === 1
        ? `You have an upcoming event: ${formatEventLine(occurrences[0].name, occurrences[0].time)}.`
        : `You have upcoming events: ${occurrences.map((o) => formatEventLine(o.name, o.time)).join("; ")}.`;
    await notificationService.sendToUser(user.id, { title, body, url: "/calendar", kind: "reminder" }, { ttl: 86400 });
  }
}

/**
 * Every minute: find event-occurrence reminders that are due (their send instant has
 * arrived and the event has not yet started) and push them, once per
 * event/occurrence/reminder. Matching is on absolute instants in the app's zone, so a
 * missed tick still fires late rather than being skipped forever. The lookahead window
 * must cover the largest supported reminder offset so week-ahead reminders are found.
 *
 * Iterates households and binds tenant request context per household, because the calendar,
 * sent-reminder, and push repositories all call `requireHouseholdId()` and fail closed
 * without it.
 */
async function runPerEventReminders(): Promise<void> {
  if (!isPushEnvConfigured()) return;
  // `sent_reminders` already makes a duplicate send impossible, so the lock here
  // is only to stop every replica doing the same scan every minute.
  await withTryAdvisoryLock("notification:per-event-reminders", () =>
    runPerEventRemindersInner()
  );
}

async function runPerEventRemindersInner(): Promise<void> {
  try {
    const now = new Date();
    // The scan window is in SAST dates so "today" matches how events are stored
    // and read everywhere else; the fire decision below is on absolute instants.
    const todayStr = nowInAppTz(now).date;
    const endStr = format(addDays(parseISO(todayStr), REMINDER_LOOKAHEAD_DAYS), "yyyy-MM-dd");
    const householdIds = await getHouseholdRepository().listAllHouseholdIds();
    for (const householdId of householdIds) {
      try {
        await runWithHouseholdFeatures(householdId, () =>
          sendPerEventRemindersForHousehold(todayStr, endStr, now)
        );
      } catch (err) {
        console.error(
          `[NotificationScheduler] Per-event reminders failed for household ${householdId}:`,
          err
        );
      }
    }
  } catch (err) {
    console.error("[NotificationScheduler] Per-event reminders failed:", err);
  }
}

async function sendPerEventRemindersForHousehold(
  todayStr: string,
  endStr: string,
  now: Date
): Promise<void> {
  const calendarService = new CalendarService();
  const sentReminderRepo = getSentReminderRepository();
  const { NotificationService } = require("./notification.service") as typeof import("./notification.service");
  const notificationService = new NotificationService();
  const occurrences = await calendarService.getAllOccurrencesInRange(todayStr, endStr);
  for (const occ of occurrences) {
    const startInstant = eventStartInstant(occ.date, occ.time);
    for (const reminder of occ.reminders) {
      const dueInstant = computeReminderDueInstant({
        eventDate: occ.date,
        eventTime: occ.time,
        offsetMinutes: reminder.offsetMinutes,
        sendTime: reminder.sendTime,
      });
      // Cheap in-memory gate before the per-reminder DB round-trip: due, not yet
      // past the event start, and not pre-cutover history.
      if (
        !shouldSendReminderNow({
          dueInstant,
          eventStartInstant: startInstant,
          now,
          alreadySent: false,
          notBefore: REMINDER_CATCHUP_FLOOR,
        })
      ) {
        continue;
      }
      const alreadySent = await sentReminderRepo.hasBeenSent(occ.eventId, occ.date, reminder.id);
      if (alreadySent) continue;
      const title = "HomeFinance";
      const body = `Reminder: ${formatEventLine(occ.name, occ.time)}`;
      if (occ.isShared) {
        await notificationService.sendToAll({ title, body, url: "/calendar", kind: "reminder" }, { ttl: 3600 });
      } else {
        await notificationService.sendToUser(
          occ.createdByUserId,
          { title, body, url: "/calendar", kind: "reminder" },
          { ttl: 3600 }
        );
      }
      await sentReminderRepo.markSent(occ.eventId, occ.date, reminder.id);
    }
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
      { timezone: APP_TIME_ZONE }
    );
    this.reminderTask = cron.schedule(
      "* * * * *",
      () => void runPerEventReminders(),
      { timezone: APP_TIME_ZONE }
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
