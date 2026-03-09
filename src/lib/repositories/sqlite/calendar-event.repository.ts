import { all, get, run, lastInsertId } from "@/lib/db";
import type { CalendarEvent } from "../interfaces/calendar-event.repository";
import type {
  ICalendarEventRepository,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
  RecurrenceType,
} from "../interfaces/calendar-event.repository";

const SELECT_FIELDS = `
  SELECT c.id, c.created_by_user_id AS "createdByUserId", u.name AS "createdByName",
    c.created_at AS "createdAt", c.name, c.location, c.date, c.time, c.notes,
    c.recurrence_type AS "recurrenceType", c.recurrence_day_of_month AS "recurrenceDayOfMonth"
  FROM calendar_events c
  INNER JOIN users u ON c.created_by_user_id = u.id
`;

interface CalendarEventRow {
  id: number;
  createdByUserId: number;
  createdByName: string;
  createdAt: string;
  name: string;
  location: string | null;
  date: string;
  time: string | null;
  notes: string | null;
  recurrenceType: string;
  recurrenceDayOfMonth: number | null;
}

function toCalendarEvent(r: CalendarEventRow): CalendarEvent {
  return {
    id: r.id,
    createdByUserId: r.createdByUserId,
    createdByName: r.createdByName,
    createdAt: r.createdAt,
    name: r.name,
    location: r.location,
    date: r.date,
    time: r.time,
    notes: r.notes,
    recurrenceType: r.recurrenceType as RecurrenceType,
    recurrenceDayOfMonth: r.recurrenceDayOfMonth,
  };
}

export class CalendarEventRepository implements ICalendarEventRepository {
  async findByDateRange(start: string, end: string): Promise<CalendarEvent[]> {
    const sql = `${SELECT_FIELDS}
      WHERE (c.recurrence_type = 'none' AND c.date >= ? AND c.date <= ?)
         OR (c.recurrence_type != 'none')
      ORDER BY c.date, c.time`;
    const rows = await all<CalendarEventRow>(sql, [start, end]);
    return rows.map(toCalendarEvent);
  }

  async findById(id: number): Promise<CalendarEvent | null> {
    const row = await get<CalendarEventRow>(`${SELECT_FIELDS} WHERE c.id = ?`, [id]);
    return row ? toCalendarEvent(row) : null;
  }

  async create(data: CreateCalendarEventInput): Promise<{ id: number }> {
    await run(
      `INSERT INTO calendar_events (created_by_user_id, name, location, date, time, notes, recurrence_type, recurrence_day_of_month)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.createdByUserId,
        data.name,
        data.location ?? null,
        data.date,
        data.time ?? null,
        data.notes ?? null,
        data.recurrenceType,
        data.recurrenceDayOfMonth ?? null,
      ]
    );
    return { id: await lastInsertId() };
  }

  async update(id: number, data: UpdateCalendarEventInput): Promise<void> {
    const updates: string[] = [];
    const params: (string | number | null)[] = [];
    if (data.name != null) {
      updates.push("name = ?");
      params.push(data.name);
    }
    if (data.location !== undefined) {
      updates.push("location = ?");
      params.push(data.location);
    }
    if (data.date != null) {
      updates.push("date = ?");
      params.push(data.date);
    }
    if (data.time !== undefined) {
      updates.push("time = ?");
      params.push(data.time);
    }
    if (data.notes !== undefined) {
      updates.push("notes = ?");
      params.push(data.notes);
    }
    if (data.recurrenceType != null) {
      updates.push("recurrence_type = ?");
      params.push(data.recurrenceType);
    }
    if (data.recurrenceDayOfMonth !== undefined) {
      updates.push("recurrence_day_of_month = ?");
      params.push(data.recurrenceDayOfMonth);
    }
    if (updates.length === 0) return;
    params.push(id);
    await run(`UPDATE calendar_events SET ${updates.join(", ")} WHERE id = ?`, params);
  }

  async delete(id: number): Promise<void> {
    await run("DELETE FROM calendar_events WHERE id = ?", [id]);
  }
}
