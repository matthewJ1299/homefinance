import { format, subMonths, addMonths, endOfMonth } from "date-fns";
import type { BudgetMonthPeriod } from "@/lib/types/budget-month";

/** Calendar month containing "today" (yyyy-MM). */
export function getCurrentMonth(): string {
  return format(new Date(), "yyyy-MM");
}

/** Clamp budget start day to 1-28 so every month has a valid start date. */
export function normalizeBudgetMonthStartDay(day: number): number {
  if (!Number.isFinite(day) || day < 1) return 1;
  if (day > 28) return 28;
  return Math.floor(day);
}

/**
 * Inclusive date range for the budget month key (yyyy-MM).
 * Start day 1 = calendar month. Otherwise e.g. 25 = 25th through 24th of next month.
 */
export function getBudgetPeriodForMonthKey(month: string, startDay: number): BudgetMonthPeriod {
  const d = normalizeBudgetMonthStartDay(startDay);
  const [y, m] = month.split("-").map(Number);
  if (d <= 1) {
    const start = new Date(y, m - 1, 1);
    const end = endOfMonth(start);
    return { start: format(start, "yyyy-MM-dd"), end: format(end, "yyyy-MM-dd") };
  }
  const start = dateForMonthAndDay(month, d);
  const nextFirst = addMonths(new Date(y, m - 1, 1), 1);
  const nextMonthKey = format(nextFirst, "yyyy-MM");
  const nextStartStr = dateForMonthAndDay(nextMonthKey, d);
  const [ny, nm, ndom] = nextStartStr.split("-").map(Number);
  const endDate = new Date(ny, nm - 1, ndom - 1);
  return { start, end: format(endDate, "yyyy-MM-dd") };
}

/**
 * Pick a transaction date for quick-add on a screen scoped to `period` (e.g. dashboard for a budget month).
 * Uses today when it falls in the period; otherwise the nearest boundary so the row appears in that month's lists.
 */
export function pickQuickAddDateForBudgetPeriod(todayIso: string, period: BudgetMonthPeriod): string {
  if (todayIso >= period.start && todayIso <= period.end) return todayIso;
  if (todayIso < period.start) return period.start;
  return period.end;
}

/** Maps a transaction date to the budget month key for the given start-day rule. */
export function budgetMonthKeyFromIsoDate(dateStr: string, startDay: number): string {
  const d = normalizeBudgetMonthStartDay(startDay);
  if (d <= 1) return monthFromDate(dateStr);
  const [y, mo, dom] = dateStr.split("-").map(Number);
  if (dom >= d) {
    return `${y}-${String(mo).padStart(2, "0")}`;
  }
  const prev = subMonths(new Date(y, mo - 1, 1), 1);
  return format(prev, "yyyy-MM");
}

/** Budget month key for "today" using the user's start day. */
export function getCurrentBudgetMonth(startDay: number): string {
  return budgetMonthKeyFromIsoDate(format(new Date(), "yyyy-MM-dd"), startDay);
}

/** Label for month navigator and headings. */
export function formatBudgetMonthLabel(month: string, startDay: number): string {
  const d = normalizeBudgetMonthStartDay(startDay);
  if (d <= 1) return formatMonth(month);
  const { start, end } = getBudgetPeriodForMonthKey(month, d);
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const ds = new Date(sy, sm - 1, sd);
  const de = new Date(ey, em - 1, ed);
  return `${format(ds, "d MMM")} - ${format(de, "d MMM yyyy")}`;
}

export function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return format(d, "MMMM yyyy");
}

export function prevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return format(subMonths(d, 1), "yyyy-MM");
}

export function nextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return format(addMonths(d, 1), "yyyy-MM");
}

export function monthFromDate(date: string): string {
  return date.slice(0, 7);
}

export function isValidMonth(month: string): boolean {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return false;
  const [, y, m] = match.map(Number);
  return m >= 1 && m <= 12 && y >= 2000 && y <= 2100;
}

/** Returns yyyy-MM-dd for the given month and day, clamping day to last day of month. */
export function dateForMonthAndDay(month: string, dayOfMonth: number): string {
  const [y, m] = month.split("-").map(Number);
  const lastDay = endOfMonth(new Date(y, m - 1, 1)).getDate();
  const day = Math.min(Math.max(1, dayOfMonth), lastDay);
  return `${month}-${String(day).padStart(2, "0")}`;
}

/** Display ISO date (yyyy-MM-dd) in a consistent short form. */
export function formatDisplayDate(isoDate: string): string {
  return format(new Date(isoDate + "T12:00:00"), "d MMM yyyy");
}

/**
 * Display a stored timestamp in the household's zone.
 *
 * Africa/Johannesburg rather than the device clock, matching the rest of the
 * app's user-facing dates: an admin reading feedback should see the time the
 * person actually sent it, not a time shifted by wherever the reader is.
 */
export function formatDisplayDateTime(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** "25th", for stating a budget month window in words. */
export function ordinalDay(day: number): string {
  const n = Math.max(1, Math.min(31, Math.round(day)));
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}
