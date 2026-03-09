import { format, subMonths, addMonths, startOfMonth, endOfMonth } from "date-fns";

export function getCurrentMonth(): string {
  return format(new Date(), "yyyy-MM");
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
