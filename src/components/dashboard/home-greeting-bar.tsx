import type { HouseholdMember } from "@/lib/types/household-member";
import { formatBudgetMonthLabel } from "@/lib/utils/date";
import { AvatarCircle } from "@/components/ui/avatar-circle";
import { formatRand } from "@/lib/utils/currency";

/** IANA zone for UTC+2 year-round (SAST). Dashboard greeting and date use this, not the device clock. */
const DASHBOARD_TIMEZONE = "Africa/Johannesburg";

function getFirstName(name: string | undefined | null): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/g)[0] ?? "there";
}

function getHourInTimezone(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const hourPart = parts.find((p) => p.type === "hour")?.value;
  return hourPart != null ? parseInt(hourPart, 10) : 0;
}

function formatDashboardDateLine(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);
}

function getTimeGreeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function HomeGreetingBar({
  month,
  budgetMonthStartDay = 1,
  userName,
  members = [],
  envelopeLeftCents,
  nowIso,
}: {
  month: string;
  /** Matches Settings > Budget month range (default 1 = calendar month). */
  budgetMonthStartDay?: number;
  userName: string;
  /** Everyone else in the household, shown as the avatar strip. */
  members?: HouseholdMember[];
  /** Optional: month-to-date balance hint under the greeting. */
  /** Sum of every category's available -- what is actually left to spend. */
  envelopeLeftCents?: number;
  /**
   * The server's instant, as ISO. Calling `new Date()` here instead means the
   * server and the client can land on different minutes -- or different
   * greetings across an hour boundary -- and React throws out the whole tree
   * as a hydration mismatch.
   */
  nowIso?: string;
}) {
  const now = nowIso ? new Date(nowIso) : new Date();
  const monthLabel = formatBudgetMonthLabel(month, budgetMonthStartDay).toUpperCase();
  const firstName = getFirstName(userName);
  const todayLine = formatDashboardDateLine(now, DASHBOARD_TIMEZONE);
  const hourUtc2 = getHourInTimezone(now, DASHBOARD_TIMEZONE);
  const greeting = getTimeGreeting(hourUtc2);

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground">
            {monthLabel}
          </div>
          <div className="text-xs text-muted-foreground">{todayLine}</div>
          <div className="pt-1 text-2xl sm:text-3xl font-semibold tracking-tight">
            {greeting}, {firstName}
          </div>
          {envelopeLeftCents != null ? (
            <p className="text-sm text-muted-foreground pt-1">
              Left in your categories{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatRand(envelopeLeftCents)}
              </span>
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <AvatarCircle name={userName} size={40} />
          {members.slice(0, 3).map((m) => (
            <AvatarCircle key={m.id} name={m.name} size={40} />
          ))}
        </div>
      </div>
    </section>
  );
}

