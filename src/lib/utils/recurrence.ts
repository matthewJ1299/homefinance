import {
  parseISO,
  format,
  addWeeks,
  addMonths,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import type { RecurrenceType } from "@/lib/repositories/interfaces/calendar-event.repository";
import { dateForMonthAndDay } from "./date";

/**
 * Returns all occurrence dates (yyyy-MM-dd) for an event in the given range.
 * Does not include time/notes etc.; caller attaches event data to each date.
 */
export function expandRecurrence(
  eventDate: string,
  recurrenceType: RecurrenceType,
  recurrenceDayOfMonth: number | null,
  rangeStart: string,
  rangeEnd: string
): string[] {
  const start = parseISO(rangeStart);
  const end = parseISO(rangeEnd);
  const first = parseISO(eventDate);
  const out: string[] = [];

  if (recurrenceType === "none") {
    if (first >= start && first <= end) out.push(eventDate);
    return out;
  }

  if (recurrenceType === "weekly") {
    let d = first;
    while (d < start) d = addWeeks(d, 1);
    while (d <= end) {
      out.push(format(d, "yyyy-MM-dd"));
      d = addWeeks(d, 1);
    }
    return out;
  }

  if (recurrenceType === "monthly") {
    const day = recurrenceDayOfMonth ?? first.getDate();
    let monthStart = startOfMonth(start);
    if (first > end) return out;
    const endMonth = endOfMonth(end);
    while (monthStart <= endMonth) {
      const monthStr = format(monthStart, "yyyy-MM");
      const d = dateForMonthAndDay(monthStr, day);
      const dDate = parseISO(d);
      if (dDate >= start && dDate <= end) out.push(d);
      monthStart = addMonths(monthStart, 1);
    }
    return out;
  }

  if (recurrenceType === "yearly") {
    const month = first.getMonth();
    const day = first.getDate();
    let year = first.getFullYear();
    const endYear = end.getFullYear();
    while (year <= endYear) {
      const d = new Date(year, month, day);
      const dStr = format(d, "yyyy-MM-dd");
      const dDate = parseISO(dStr);
      if (dDate >= start && dDate <= end) out.push(dStr);
      year += 1;
    }
    return out;
  }

  return out;
}
