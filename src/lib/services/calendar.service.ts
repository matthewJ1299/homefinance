import { getCalendarEventRepository } from "@/lib/repositories";
import { expandRecurrence } from "@/lib/utils/recurrence";
import type { CalendarEvent } from "@/lib/repositories/interfaces/calendar-event.repository";

export interface CalendarEventOccurrence {
  eventId: number;
  date: string;
  time: string | null;
  name: string;
  location: string | null;
  notes: string | null;
  createdByUserId: number;
  createdByName: string;
  recurrenceType: string;
}

export interface CreateCalendarEventInput {
  name: string;
  location?: string | null;
  date: string;
  time?: string | null;
  notes?: string | null;
  recurrenceType: "none" | "weekly" | "monthly" | "yearly";
  recurrenceDayOfMonth?: number | null;
}

export interface UpdateCalendarEventInput {
  name?: string;
  location?: string | null;
  date?: string;
  time?: string | null;
  notes?: string | null;
  recurrenceType?: "none" | "weekly" | "monthly" | "yearly";
  recurrenceDayOfMonth?: number | null;
}

export class CalendarService {
  constructor(private repo = getCalendarEventRepository()) {}

  async getByDateRange(start: string, end: string): Promise<CalendarEventOccurrence[]> {
    const events = await this.repo.findByDateRange(start, end);
    const occurrences: CalendarEventOccurrence[] = [];
    for (const event of events) {
      const dates = expandRecurrence(
        event.date,
        event.recurrenceType,
        event.recurrenceDayOfMonth,
        start,
        end
      );
      for (const date of dates) {
        occurrences.push({
          eventId: event.id,
          date,
          time: event.time,
          name: event.name,
          location: event.location,
          notes: event.notes,
          createdByUserId: event.createdByUserId,
          createdByName: event.createdByName,
          recurrenceType: event.recurrenceType,
        });
      }
    }
    occurrences.sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return d;
      const t = (a.time ?? "").localeCompare(b.time ?? "");
      return t;
    });
    return occurrences;
  }

  async create(userId: number, data: CreateCalendarEventInput): Promise<{ id: number }> {
    return this.repo.create({
      createdByUserId: userId,
      name: data.name,
      location: data.location,
      date: data.date,
      time: data.time,
      notes: data.notes,
      recurrenceType: data.recurrenceType,
      recurrenceDayOfMonth: data.recurrenceDayOfMonth,
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
}
