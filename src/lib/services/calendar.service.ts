import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  subDays,
} from "date-fns";
import { getCalendarEventRepository } from "@/lib/repositories";
import { expandRecurrence } from "@/lib/utils/recurrence";
import type { CalendarEvent, EventReminder } from "@/lib/repositories/interfaces/calendar-event.repository";
import type { ReminderSpec } from "@/lib/utils/reminder-time";

export interface CalendarEventOccurrence {
  eventId: number;
  /** Inclusive start date of this segment (yyyy-MM-dd). */
  date: string;
  /** Inclusive end date for multi-day segments; null means single-day. */
  endDate: string | null;
  time: string | null;
  endTime: string | null;
  name: string;
  location: string | null;
  notes: string | null;
  createdByUserId: number;
  createdByName: string;
  recurrenceType: string;
  /** @deprecated superseded by `reminders`. */
  reminderMinutes: number | null;
  reminders: EventReminder[];
  expectedCostMinor: number | null;
  expenseCategoryId: number | null;
  loggedExpenseId: number | null;
  categoryId: number | null;
  categoryName: string | null;
  categoryColor: string | null;
  isShared: boolean;
  priority: number;
}

export interface CreateCalendarEventInput {
  name: string;
  location?: string | null;
  date: string;
  endDate?: string | null;
  time?: string | null;
  endTime?: string | null;
  notes?: string | null;
  recurrenceType: "none" | "weekly" | "monthly" | "yearly";
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
  recurrenceType?: "none" | "weekly" | "monthly" | "yearly";
  recurrenceDayOfMonth?: number | null;
  /** @deprecated no longer written; use `reminders`. */
  reminderMinutes?: number | null;
  reminders?: ReminderSpec[];
  categoryId?: number | null;
  isShared?: boolean;
  priority?: number;
}

function segmentDurationDays(event: CalendarEvent): number {
  if (!event.endDate) return 0;
  const n = differenceInCalendarDays(parseISO(event.endDate), parseISO(event.date));
  return Math.max(0, n);
}

function occurrenceSort(a: CalendarEventOccurrence, b: CalendarEventOccurrence): number {
  const d = a.date.localeCompare(b.date);
  if (d !== 0) return d;
  const t = (a.time ?? "").localeCompare(b.time ?? "");
  if (t !== 0) return t;
  return (b.priority ?? 2) - (a.priority ?? 2);
}

export class CalendarService {
  constructor(private repo = getCalendarEventRepository()) {}

  /**
   * Events visible to the signed-in user: shared household events plus that user's personal events.
   */
  async getByDateRange(
    start: string,
    end: string,
    viewerUserId: number
  ): Promise<CalendarEventOccurrence[]> {
    const events = await this.repo.findByDateRangeForViewer(start, end, viewerUserId);
    return this.expandEventsToOccurrences(events, start, end);
  }

  /**
   * All events in range (ignores personal vs shared). Used for reminder scheduling.
   */
  async getAllOccurrencesInRange(start: string, end: string): Promise<CalendarEventOccurrence[]> {
    const events = await this.repo.findByDateRangeAll(start, end);
    return this.expandEventsToOccurrences(events, start, end);
  }

  async create(userId: number, data: CreateCalendarEventInput): Promise<{ id: number }> {
    return this.repo.create({
      createdByUserId: userId,
      name: data.name,
      location: data.location,
      date: data.date,
      endDate: data.endDate,
      time: data.time,
      endTime: data.endTime,
      notes: data.notes,
      recurrenceType: data.recurrenceType,
      recurrenceDayOfMonth: data.recurrenceDayOfMonth,
      reminders: data.reminders,
      categoryId: data.categoryId,
      isShared: data.isShared,
      priority: data.priority,
    });
  }

  async update(id: number, data: UpdateCalendarEventInput): Promise<void> {
    await this.repo.update(id, data);
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  async getEvent(id: number): Promise<CalendarEvent | null> {
    return this.repo.findById(id);
  }

  private expandEventsToOccurrences(
    events: CalendarEvent[],
    rangeStart: string,
    rangeEnd: string
  ): CalendarEventOccurrence[] {
    const occurrences: CalendarEventOccurrence[] = [];
    const rangeStartDate = parseISO(rangeStart);

    for (const event of events) {
      const duration = segmentDurationDays(event);
      const paddedStart = format(subDays(rangeStartDate, duration), "yyyy-MM-dd");
      const anchorDates = expandRecurrence(
        event.date,
        event.recurrenceType,
        event.recurrenceDayOfMonth,
        paddedStart,
        rangeEnd
      );

      for (const anchor of anchorDates) {
        const segEnd = format(addDays(parseISO(anchor), duration), "yyyy-MM-dd");
        if (segEnd < rangeStart || anchor > rangeEnd) continue;

        occurrences.push({
          eventId: event.id,
          date: anchor,
          endDate: duration > 0 ? segEnd : null,
          time: event.time,
          endTime: event.endTime,
          name: event.name,
          location: event.location,
          notes: event.notes,
          createdByUserId: event.createdByUserId,
          createdByName: event.createdByName,
          recurrenceType: event.recurrenceType,
          reminderMinutes: event.reminderMinutes ?? null,
          reminders: event.reminders,
          expectedCostMinor: event.expectedCostMinor,
          expenseCategoryId: event.expenseCategoryId,
          loggedExpenseId: event.loggedExpenseId,
          categoryId: event.categoryId,
          categoryName: event.categoryName,
          categoryColor: event.categoryColor,
          isShared: event.isShared,
          priority: event.priority,
        });
      }
    }
    occurrences.sort(occurrenceSort);
    return occurrences;
  }
}
