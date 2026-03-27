export type RecurrenceType = "none" | "weekly" | "monthly" | "yearly";

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
  reminderMinutes: number | null;
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
  reminderMinutes?: number | null;
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
  reminderMinutes?: number | null;
  categoryId?: number | null;
  isShared?: boolean;
  priority?: number;
}

export interface ICalendarEventRepository {
  findByDateRangeForViewer(start: string, end: string, viewerUserId: number): Promise<CalendarEvent[]>;
  /** All events in range (no visibility filter); for reminder scheduling only. */
  findByDateRangeAll(start: string, end: string): Promise<CalendarEvent[]>;
  findById(id: number): Promise<CalendarEvent | null>;
  create(data: CreateCalendarEventInput): Promise<{ id: number }>;
  update(id: number, data: UpdateCalendarEventInput): Promise<void>;
  delete(id: number): Promise<void>;
}
