import { format, parseISO, subDays, subMinutes } from "date-fns";

/**
 * How many days ahead the reminder scheduler scans for event occurrences.
 * MUST be >= the largest day-offset in REMINDER_OFFSET_OPTIONS / the validator cap
 * (20160 min = 14 days), or a "2 weeks before" reminder would never be found.
 */
export const REMINDER_LOOKAHEAD_DAYS = 16;

export interface ReminderSpec {
  offsetMinutes: number;
  /** 'HH:mm' local time to send; null = derive from event time minus the offset. */
  sendTime: string | null;
}

export interface ReminderOffsetOption {
  minutes: number;
  label: string;
  /** Day-or-more offsets let the user pick the exact send time. */
  requiresTime: boolean;
}

export const REMINDER_OFFSET_OPTIONS: ReminderOffsetOption[] = [
  { minutes: 0, label: "At event time", requiresTime: false },
  { minutes: 5, label: "5 minutes before", requiresTime: false },
  { minutes: 10, label: "10 minutes before", requiresTime: false },
  { minutes: 15, label: "15 minutes before", requiresTime: false },
  { minutes: 30, label: "30 minutes before", requiresTime: false },
  { minutes: 60, label: "1 hour before", requiresTime: false },
  { minutes: 120, label: "2 hours before", requiresTime: false },
  { minutes: 1440, label: "1 day before", requiresTime: true },
  { minutes: 2880, label: "2 days before", requiresTime: true },
  { minutes: 10080, label: "1 week before", requiresTime: true },
  { minutes: 20160, label: "2 weeks before", requiresTime: true },
];

export const REMINDER_MAX_OFFSET_MINUTES = 20160;
export const DEFAULT_REMINDER_SEND_TIME = "09:00";

export function normalizeReminderSendTime(value: string | null | undefined): string | null {
  if (value == null || value.trim() === "") return null;
  return value.trim().slice(0, 5);
}

export function offsetRequiresTime(offsetMinutes: number): boolean {
  const known = REMINDER_OFFSET_OPTIONS.find((o) => o.minutes === offsetMinutes);
  if (known) return known.requiresTime;
  return offsetMinutes >= 1440;
}

export function reminderOffsetOptionsIncluding(currentMinutes: number): ReminderOffsetOption[] {
  if (REMINDER_OFFSET_OPTIONS.some((o) => o.minutes === currentMinutes)) {
    return REMINDER_OFFSET_OPTIONS;
  }
  return [
    ...REMINDER_OFFSET_OPTIONS,
    {
      minutes: currentMinutes,
      label: `${currentMinutes} minutes before`,
      requiresTime: offsetRequiresTime(currentMinutes),
    },
  ].sort((a, b) => a.minutes - b.minutes);
}

/**
 * Resolve when a reminder should fire for a specific event occurrence.
 * - sendTime set: fire at sendTime on (eventDate - floor(offsetMinutes / 1440) days).
 *   Works for all-day events (no eventTime).
 * - sendTime null (legacy): fire at (eventDate + eventTime) - offsetMinutes.
 *   Returns null when the event has no time.
 */
export function computeReminderInstant(input: {
  eventDate: string;
  eventTime: string | null;
  offsetMinutes: number;
  sendTime: string | null;
}): { date: string; time: string } | null {
  const { eventDate, eventTime, offsetMinutes, sendTime } = input;
  try {
    const clock = normalizeReminderSendTime(sendTime);
    if (clock != null) {
      const daysBack = Math.floor(offsetMinutes / 1440);
      const d = subDays(parseISO(eventDate), daysBack);
      return { date: format(d, "yyyy-MM-dd"), time: clock };
    }
    if (eventTime == null || !eventTime.trim()) return null;
    const dt = subMinutes(parseISO(`${eventDate}T${eventTime}`), offsetMinutes);
    return { date: format(dt, "yyyy-MM-dd"), time: format(dt, "HH:mm") };
  } catch {
    return null;
  }
}
