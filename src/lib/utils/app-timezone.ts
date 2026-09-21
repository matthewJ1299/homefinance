/**
 * The one timezone the whole app reasons in.
 *
 * Africa/Johannesburg (SAST) is a fixed UTC+2 with no daylight saving, ever --
 * which is the only reason a bare wall-clock ("14:00" on a date) can be turned
 * into an absolute instant by appending a constant offset. If the app ever
 * serves a zone that observes DST, `appWallClockToInstant` is the thing to
 * revisit; `nowInAppTz` already goes through `Intl` and would keep working.
 */
export const APP_TIME_ZONE = "Africa/Johannesburg";

/** SAST's fixed offset. See APP_TIME_ZONE for why a literal is safe here. */
const APP_UTC_OFFSET = "+02:00";

/**
 * "Now" as the wall clock a user in the app's zone would read, independent of
 * the server process timezone -- which is UTC in production, because `TZ` is
 * set nowhere. date-fns `format(new Date(), ...)` renders in the process zone,
 * so it must not be used to decide when a SAST-scheduled thing is due.
 */
export function nowInAppTz(now: Date = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

/**
 * The absolute instant of a wall-clock date+time read in the app's zone.
 * `date` is "yyyy-MM-dd", `time` is "HH:mm". Valid because SAST has no DST.
 */
export function appWallClockToInstant(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${APP_UTC_OFFSET}`);
}
