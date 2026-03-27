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
    c.created_at AS "createdAt", c.name, c.location, c.date, c.end_date AS "endDate", c.time, c.end_time AS "endTime", c.notes,
    c.recurrence_type AS "recurrenceType", c.recurrence_day_of_month AS "recurrenceDayOfMonth",
    c.reminder_minutes AS "reminderMinutes",
    c.category_id AS "categoryId",
    cat.name AS "categoryName", cat.color AS "categoryColor",
    c.is_shared AS "isShared", c.priority
  FROM calendar_events c
  INNER JOIN users u ON c.created_by_user_id = u.id
  LEFT JOIN calendar_categories cat ON c.category_id = cat.id
`;

interface CalendarEventRow {
  id: number;
  createdByUserId: number;
  createdByName: string;
  createdAt: string;
  name: string;
  location: string | null;
  date: string;
  endDate: string | null;
  time: string | null;
  endTime: string | null;
  notes: string | null;
  recurrenceType: string;
  recurrenceDayOfMonth: number | null;
  reminderMinutes: number | null;
  categoryId: number | null;
  categoryName: string | null;
  categoryColor: string | null;
  isShared: boolean;
  priority: number;
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
    endDate: r.endDate ?? null,
    time: r.time,
    endTime: r.endTime ?? null,
    notes: r.notes,
    recurrenceType: r.recurrenceType as RecurrenceType,
    recurrenceDayOfMonth: r.recurrenceDayOfMonth,
    reminderMinutes: r.reminderMinutes ?? null,
    categoryId: r.categoryId ?? null,
    categoryName: r.categoryName ?? null,
    categoryColor: r.categoryColor ?? null,
    isShared: r.isShared !== false,
    priority: typeof r.priority === "number" ? r.priority : 2,
  };
}

const RANGE_WHERE = `WHERE ((c.recurrence_type = 'none' AND c.date <= ? AND COALESCE(c.end_date, c.date) >= ?)
     OR (c.recurrence_type != 'none'))`;

export class CalendarEventRepository implements ICalendarEventRepository {
  async findByDateRangeForViewer(
    start: string,
    end: string,
    viewerUserId: number
  ): Promise<CalendarEvent[]> {
    const sql = `${SELECT_FIELDS}
      ${RANGE_WHERE}
        AND (c.is_shared = true OR c.created_by_user_id = ?)
      ORDER BY c.date, c.time`;
    const rows = await all<CalendarEventRow>(sql, [end, start, viewerUserId]);
    return rows.map(toCalendarEvent);
  }

  async findByDateRangeAll(start: string, end: string): Promise<CalendarEvent[]> {
    const sql = `${SELECT_FIELDS}
      ${RANGE_WHERE}
      ORDER BY c.date, c.time`;
    const rows = await all<CalendarEventRow>(sql, [end, start]);
    return rows.map(toCalendarEvent);
  }

  async findById(id: number): Promise<CalendarEvent | null> {
    const row = await get<CalendarEventRow>(`${SELECT_FIELDS} WHERE c.id = ?`, [id]);
    return row ? toCalendarEvent(row) : null;
  }

  async create(data: CreateCalendarEventInput): Promise<{ id: number }> {
    await run(
      `INSERT INTO calendar_events (
        created_by_user_id, name, location, date, end_date, time, end_time, notes,
        recurrence_type, recurrence_day_of_month, reminder_minutes,
        category_id, is_shared, priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.createdByUserId,
        data.name,
        data.location ?? null,
        data.date,
        data.endDate ?? null,
        data.time ?? null,
        data.endTime ?? null,
        data.notes ?? null,
        data.recurrenceType,
        data.recurrenceDayOfMonth ?? null,
        data.reminderMinutes ?? null,
        data.categoryId ?? null,
        data.isShared !== false,
        data.priority ?? 2,
      ]
    );
    return { id: await lastInsertId() };
  }

  async update(id: number, data: UpdateCalendarEventInput): Promise<void> {
    const updates: string[] = [];
    const params: (string | number | boolean | null)[] = [];
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
    if (data.endDate !== undefined) {
      updates.push("end_date = ?");
      params.push(data.endDate);
    }
    if (data.time !== undefined) {
      updates.push("time = ?");
      params.push(data.time);
    }
    if (data.endTime !== undefined) {
      updates.push("end_time = ?");
      params.push(data.endTime);
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
    if (data.reminderMinutes !== undefined) {
      updates.push("reminder_minutes = ?");
      params.push(data.reminderMinutes);
    }
    if (data.categoryId !== undefined) {
      updates.push("category_id = ?");
      params.push(data.categoryId);
    }
    if (data.isShared !== undefined) {
      updates.push("is_shared = ?");
      params.push(data.isShared);
    }
    if (data.priority !== undefined) {
      updates.push("priority = ?");
      params.push(data.priority);
    }
    if (updates.length === 0) return;
    params.push(id);
    await run(`UPDATE calendar_events SET ${updates.join(", ")} WHERE id = ?`, params);
  }

  async delete(id: number): Promise<void> {
    await run("DELETE FROM calendar_events WHERE id = ?", [id]);
  }
}
