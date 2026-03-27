/**
 * Format as 24h "HH:mm" for compact schedule UIs. Empty string if no time.
 */
export function formatTime24(time: string | null | undefined): string {
  if (!time || !time.trim()) return "";
  const parts = time.split(":");
  const h = String(parts[0] ?? "0").padStart(2, "0");
  const m = String(parts[1] ?? "0").padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Format a time string (HH:mm or HH:mm:ss) for display (e.g. "10 AM", "2:30 PM").
 * Returns "all day" when time is null or empty.
 */
export function formatTime(time: string | null | undefined): string {
  if (!time || !time.trim()) return "all day";
  const parts = time.split(":").map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const hour = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return m > 0 ? `${hour}:${String(m).padStart(2, "0")} ${ampm}` : `${hour} ${ampm}`;
}

/**
 * Format an event for a notification line: "Name at 10 AM" or "Name (all day)".
 */
export function formatEventLine(name: string, time: string | null | undefined): string {
  const t = formatTime(time);
  return t === "all day" ? `${name} (all day)` : `${name} at ${t}`;
}
