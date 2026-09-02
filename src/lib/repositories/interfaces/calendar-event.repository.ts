import type { ReminderSpec } from "@/lib/utils/reminder-time";

export type RecurrenceType = "none" | "weekly" | "monthly" | "yearly";

export interface EventReminder {
  id: number;
  eventId: number;
  offsetMinutes: number;
  sendTime: string | null;
}

export interface CalendarEvent {
  id: number;
  createdByUserId: number;
  createdByName: string;
  createdAt: string;
  name: string;
  location: string | null;
  date: string;
  /** Inclusive end date for multi-day spans; null means single-day (same as `date`). */
  endDate: string | null;
  time: string | null;
  endTime: string | null;
  notes: string | null;
  recurrenceType: RecurrenceType;
  recurrenceDayOfMonth: number | null;
  /** @deprecated superseded by `reminders`; kept for legacy read paths. */
  reminderMinutes: number | null;
  reminders: EventReminder[];
  categoryId: number | null;
  categoryName: string | null;
  categoryColor: string | null;
  isShared: boolean;
  priority: number;
}

export interface CreateCalendarEventInput {
  createdByUserId: number;
  name: string;
  location?: string | null;
  date: string;
  endDate?: string | null;
  time?: string | null;
  endTime?: string | null;
  notes?: string | null;
  recurrenceType: RecurrenceType;
  recurrenceDayOfMonth?: number | null;
  /** @deprecated no longer written; use `reminders`. */
  reminderMinutes?: number | null;
  reminders?: ReminderSpec[];
  categoryId?: number | null;
  isShared?: boolean;
  priority?: number;
}

export interface UpdateCalendarEventInput {
  name?: string;
  location?: string | null;
  date?: string;
  endDate?: string | null;
  time?: string | null;
  endTime?: string | null;
  notes?: string | null;
  recurrenceType?: RecurrenceType;
  recurrenceDayOfMonth?: number | null;
  /** @deprecated no longer written; use `reminders`. */
  reminderMinutes?: number | null;
  /** When provided (even empty), replaces the event's reminder set. */
  reminders?: ReminderSpec[];
  categoryId?: number | null;
  isShared?: boolean;
  priority?: number;
}

export interface ICalendarEventRepository {
  findByDateRangeForViewer(start: string, end: string, viewerUserId: number): Promise<CalendarEvent[]>;
  /** All events in range (no visibility filter); for reminder scheduling only. */
  findByDateRangeAll(start: string, end: string): Promise<CalendarEvent[]>;
  findById(id: number): Promise<CalendarEvent | null>;
  findRemindersByEventIds(eventIds: number[]): Promise<EventReminder[]>;
  replaceReminders(eventId: number, reminders: ReminderSpec[]): Promise<void>;
  create(data: CreateCalendarEventInput): Promise<{ id: number }>;
  update(id: number, data: UpdateCalendarEventInput): Promise<void>;
  delete(id: number): Promise<void>;
}
