import { all, get, run, lastInsertId, withTransaction } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import type { CalendarEvent, EventReminder } from "../interfaces/calendar-event.repository";
import type {
  ICalendarEventRepository,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
  RecurrenceType,
} from "../interfaces/calendar-event.repository";
import { normalizeReminderSendTime, type ReminderSpec } from "@/lib/utils/reminder-time";

function reminderSpecKey(offsetMinutes: number, sendTime: string | null): string {
  return `${offsetMinutes}|${sendTime ?? ""}`;
}

const SELECT_FIELDS = `
  SELECT c.id, c.created_by_user_id AS "createdByUserId", u.name AS "createdByName",
    c.created_at AS "createdAt", c.name, c.location, c.date, c.end_date AS "endDate", c.time, c.end_time AS "endTime", c.notes,
    c.recurrence_type AS "recurrenceType", c.recurrence_day_of_month AS "recurrenceDayOfMonth",
    c.reminder_minutes AS "reminderMinutes",
    c.category_id AS "categoryId",
    cat.name AS "categoryName", cat.color AS "categoryColor",
    c.is_shared AS "isShared", c.priority,
    c.expected_cost_minor AS "expectedCostMinor",
    c.expense_category_id AS "expenseCategoryId",
    c.logged_expense_id AS "loggedExpenseId"
  FROM calendar_events c
  INNER JOIN users u ON c.created_by_user_id = u.id AND u.household_id = c.household_id
  LEFT JOIN calendar_categories cat ON c.category_id = cat.id AND cat.household_id = c.household_id
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
  expectedCostMinor: number | null;
  expenseCategoryId: number | null;
  loggedExpenseId: number | null;
}

interface ReminderRow {
  id: number;
  eventId: number;
  offsetMinutes: number;
  sendTime: string | null;
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
    reminders: [],
    categoryId: r.categoryId ?? null,
    categoryName: r.categoryName ?? null,
    categoryColor: r.categoryColor ?? null,
    isShared: r.isShared !== false,
    priority: typeof r.priority === "number" ? r.priority : 2,
    expectedCostMinor: r.expectedCostMinor ?? null,
    expenseCategoryId: r.expenseCategoryId ?? null,
    loggedExpenseId: r.loggedExpenseId ?? null,
  };
}

const RANGE_FILTER = `((c.recurrence_type = 'none' AND c.date <= ? AND COALESCE(c.end_date, c.date) >= ?)
     OR (c.recurrence_type != 'none'))`;

export class CalendarEventRepository implements ICalendarEventRepository {
  async findByDateRangeForViewer(
    start: string,
    end: string,
    viewerUserId: number
  ): Promise<CalendarEvent[]> {
    const hid = requireHouseholdId();
    const sql = `${SELECT_FIELDS}
      WHERE c.household_id = ? AND ${RANGE_FILTER}
        AND (c.is_shared = true OR c.created_by_user_id = ?)
      ORDER BY c.date, c.time`;
    const rows = await all<CalendarEventRow>(sql, [hid, end, start, viewerUserId]);
    return this.attachReminders(rows.map(toCalendarEvent));
  }

  async findByDateRangeAll(start: string, end: string): Promise<CalendarEvent[]> {
    const hid = requireHouseholdId();
    const sql = `${SELECT_FIELDS}
      WHERE c.household_id = ? AND ${RANGE_FILTER}
      ORDER BY c.date, c.time`;
    const rows = await all<CalendarEventRow>(sql, [hid, end, start]);
    return this.attachReminders(rows.map(toCalendarEvent));
  }

  async findById(id: number): Promise<CalendarEvent | null> {
    const hid = requireHouseholdId();
    const row = await get<CalendarEventRow>(`${SELECT_FIELDS} WHERE c.id = ? AND c.household_id = ?`, [
      id,
      hid,
    ]);
    if (!row) return null;
    const [event] = await this.attachReminders([toCalendarEvent(row)]);
    return event;
  }

  /**
   * `calendar_event_reminders` carries no `household_id`; it is isolated by joining
   * `calendar_events`, so a caller cannot read another tenant's reminders by event id.
   */
  async findRemindersByEventIds(eventIds: number[]): Promise<EventReminder[]> {
    if (eventIds.length === 0) return [];
    const hid = requireHouseholdId();
    const placeholders = eventIds.map(() => "?").join(",");
    const rows = await all<ReminderRow>(
      `SELECT r.id, r.event_id AS "eventId", r.offset_minutes AS "offsetMinutes", r.send_time AS "sendTime"
       FROM calendar_event_reminders r
       INNER JOIN calendar_events c ON c.id = r.event_id
       WHERE r.event_id IN (${placeholders}) AND c.household_id = ?
       ORDER BY r.event_id, r.offset_minutes`,
      [...eventIds, hid]
    );
    return rows.map((r) => ({
      id: r.id,
      eventId: r.eventId,
      offsetMinutes: r.offsetMinutes,
      sendTime: r.sendTime ?? null,
    }));
  }

  async replaceReminders(eventId: number, reminders: ReminderSpec[]): Promise<void> {
    const hid = requireHouseholdId();
    const wantedByKey = new Map<string, ReminderSpec>();
    for (const r of reminders) {
      const sendTime = normalizeReminderSendTime(r.sendTime);
      wantedByKey.set(reminderSpecKey(r.offsetMinutes, sendTime), {
        offsetMinutes: r.offsetMinutes,
        sendTime,
      });
    }

    await withTransaction(async () => {
      // Reject up front rather than per-statement: an event outside this household
      // must not have its reminders replaced.
      const owned = await get<{ id: number }>(
        "SELECT id FROM calendar_events WHERE id = ? AND household_id = ? LIMIT 1",
        [eventId, hid]
      );
      if (!owned) return;

      const existing = await this.findRemindersByEventIds([eventId]);
      const keptKeys = new Set<string>();
      for (const row of existing) {
        const key = reminderSpecKey(
          row.offsetMinutes,
          normalizeReminderSendTime(row.sendTime)
        );
        if (wantedByKey.has(key) && !keptKeys.has(key)) {
          keptKeys.add(key);
          continue;
        }
        await run("DELETE FROM calendar_event_reminders WHERE id = ?", [row.id]);
      }
      for (const [key, spec] of wantedByKey) {
        if (keptKeys.has(key)) continue;
        await run(
          "INSERT INTO calendar_event_reminders (event_id, offset_minutes, send_time) VALUES (?, ?, ?)",
          [eventId, spec.offsetMinutes, spec.sendTime]
        );
      }
    });
  }

  async create(data: CreateCalendarEventInput): Promise<{ id: number }> {
    const hid = requireHouseholdId();
    await run(
      `INSERT INTO calendar_events (
        created_by_user_id, household_id, name, location, date, end_date, time, end_time, notes,
        recurrence_type, recurrence_day_of_month, reminder_minutes,
        category_id, is_shared, priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.createdByUserId,
        hid,
        data.name,
        data.location ?? null,
        data.date,
        data.endDate ?? null,
        data.time ?? null,
        data.endTime ?? null,
        data.notes ?? null,
        data.recurrenceType,
        data.recurrenceDayOfMonth ?? null,
        null,
        data.categoryId ?? null,
        data.isShared !== false,
        data.priority ?? 2,
      ]
    );
    const id = await lastInsertId();
    if (data.reminders && data.reminders.length > 0) {
      await this.replaceReminders(id, data.reminders);
    }
    return { id };
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
    if (updates.length > 0) {
      const hid = requireHouseholdId();
      params.push(id, hid);
      await run(
        `UPDATE calendar_events SET ${updates.join(", ")} WHERE id = ? AND household_id = ?`,
        params
      );
    }
    if (data.reminders !== undefined) {
      // Scopes to the household itself; a foreign event id is a no-op.
      await this.replaceReminders(id, data.reminders);
    }
  }

  async delete(id: number): Promise<void> {
    const hid = requireHouseholdId();
    await run("DELETE FROM calendar_events WHERE id = ? AND household_id = ?", [id, hid]);
  }

  private async attachReminders(events: CalendarEvent[]): Promise<CalendarEvent[]> {
    if (events.length === 0) return events;
    const reminders = await this.findRemindersByEventIds(events.map((e) => e.id));
    const byEvent = new Map<number, EventReminder[]>();
    for (const r of reminders) {
      const list = byEvent.get(r.eventId) ?? [];
      list.push(r);
      byEvent.set(r.eventId, list);
    }
    for (const e of events) {
      e.reminders = byEvent.get(e.id) ?? [];
    }
    return events;
  }
}
