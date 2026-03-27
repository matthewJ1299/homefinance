/** Shared helpers for calendar occurrence date ranges (client- and server-safe). */

export function occurrenceSegmentEnd(o: { date: string; endDate: string | null }): string {
  return o.endDate ?? o.date;
}

export function occurrenceCoversDate(
  o: { date: string; endDate: string | null },
  day: string
): boolean {
  return day >= o.date && day <= occurrenceSegmentEnd(o);
}
