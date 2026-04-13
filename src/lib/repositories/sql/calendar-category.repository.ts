import { all } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import type { CalendarCategory, ICalendarCategoryRepository } from "../interfaces/calendar-category.repository";

interface Row {
  id: number;
  name: string;
  color: string;
  sortOrder: number;
}

export class CalendarCategoryRepository implements ICalendarCategoryRepository {
  async findAll(): Promise<CalendarCategory[]> {
    const hid = requireHouseholdId();
    const rows = await all<Row>(
      `SELECT id, name, color, sort_order AS "sortOrder"
       FROM calendar_categories
       WHERE household_id = ?
       ORDER BY sort_order ASC, name ASC`,
      [hid]
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      sortOrder: r.sortOrder,
    }));
  }
}
