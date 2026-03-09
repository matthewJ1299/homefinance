import Link from "next/link";
import type { CalendarEventOccurrence } from "@/lib/services/calendar.service";
import { formatTime } from "@/lib/utils/format-time";

interface TodayCalendarTileProps {
  occurrences: CalendarEventOccurrence[];
}

export function TodayCalendarTile({ occurrences }: TodayCalendarTileProps) {
  return (
    <section aria-labelledby="today-calendar-heading">
      <Link
        href="/calendar"
        className="block rounded-lg border bg-card p-3 text-sm text-card-foreground shadow-sm hover:bg-accent/50 transition-colors"
      >
        <h2 id="today-calendar-heading" className="font-medium text-foreground mb-1.5">
          Today&apos;s events
        </h2>
        {occurrences.length === 0 ? (
          <p className="text-muted-foreground">No events today</p>
        ) : (
          <ul className="space-y-1">
            {occurrences.map((o) => (
              <li key={`${o.eventId}-${o.date}-${o.time ?? "all-day"}`} className="flex items-baseline gap-2">
                {o.time ? (
                  <span className="text-muted-foreground shrink-0 tabular-nums">{formatTime(o.time)}</span>
                ) : null}
                <span>{o.name}</span>
              </li>
            ))}
          </ul>
        )}
      </Link>
    </section>
  );
}
