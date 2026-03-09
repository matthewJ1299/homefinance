export type RecurrenceType = "none" | "weekly" | "monthly" | "yearly";

export interface CalendarEvent {
  id: number;
  createdByUserId: number;
  createdByName: string;
  createdAt: string;
  name: string;
  location: string | null;
  date: string;
  time: string | null;
  notes: string | null;
  recurrenceType: RecurrenceType;
  recurrenceDayOfMonth: number | null;
}

export interface CreateCalendarEventInput {
  createdByUserId: number;
  name: string;
  location?: string | null;
  date: string;
  time?: string | null;
  notes?: string | null;
  recurrenceType: RecurrenceType;
  recurrenceDayOfMonth?: number | null;
}

export interface UpdateCalendarEventInput {
  name?: string;
  location?: string | null;
  date?: string;
  time?: string | null;
  notes?: string | null;
  recurrenceType?: RecurrenceType;
  recurrenceDayOfMonth?: number | null;
}

export interface ICalendarEventRepository {
  findByDateRange(start: string, end: string): Promise<CalendarEvent[]>;
  findById(id: number): Promise<CalendarEvent | null>;
  create(data: CreateCalendarEventInput): Promise<{ id: number }>;
  update(id: number, data: UpdateCalendarEventInput): Promise<void>;
  delete(id: number): Promise<void>;
}
