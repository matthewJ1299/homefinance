import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { CalendarEventOccurrence } from "@/lib/services/calendar.service";
import { occurrenceSegmentEnd } from "@/lib/utils/calendar-occurrence";
import { formatTime } from "@/lib/utils/format-time";
import { format } from "date-fns";

interface TodayCalendarTileProps {
  todayOccurrences: CalendarEventOccurrence[];
  nextOccurrence: CalendarEventOccurrence | null;
}

export function TodayCalendarTile({ todayOccurrences, nextOccurrence }: TodayCalendarTileProps) {
  return (
    <section aria-label="Today and next event">
      <Link
        href="/calendar"
        className="block rounded-2xl border border-border/60 bg-card/90 p-3 sm:p-4 text-sm text-card-foreground shadow-sm hover:bg-accent/20 transition-colors duration-200 cursor-pointer"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-foreground tracking-tight">Upcoming events</h2>
            <div className="text-xs text-muted-foreground mt-1">
              {todayOccurrences.length === 0 ? "No events today" : "Today on your calendar"}
            </div>
          </div>
          <span className="text-xs font-medium text-primary shrink-0">See all</span>
        </div>

        {todayOccurrences.length === 0 ? (
          <div className="mt-2.5 sm:mt-3 space-y-2">
            <p className="text-muted-foreground text-sm">No events today</p>
            {nextOccurrence ? (
              <div className="rounded-xl border border-border/50 bg-background/30 p-2.5 sm:p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Next</p>
                  <p className="font-medium truncate">{nextOccurrence.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      const last = occurrenceSegmentEnd(nextOccurrence);
                      const range =
                        last > nextOccurrence.date
                          ? `${format(new Date(nextOccurrence.date + "T12:00:00"), "MMM d")} – ${format(new Date(last + "T12:00:00"), "MMM d")}`
                          : format(new Date(nextOccurrence.date + "T12:00:00"), "MMM d");
                      return range + (nextOccurrence.time ? ` • ${formatTime(nextOccurrence.time)}` : "");
                    })()}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming events</p>
            )}
          </div>
        ) : (
          <div className="mt-2.5 sm:mt-3 space-y-2">
            {todayOccurrences.slice(0, 2).map((o) => (
              <div
                key={`${o.eventId}-${o.date}-${o.endDate ?? ""}-${o.time ?? "all-day"}`}
                className="rounded-xl border border-border/50 bg-background/30 p-2.5 sm:p-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{o.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {occurrenceSegmentEnd(o) > o.date
                      ? `${format(new Date(o.date + "T12:00:00"), "MMM d")} – ${format(new Date(occurrenceSegmentEnd(o) + "T12:00:00"), "MMM d")}`
                      : "Today"}
                    {o.time ? `, ${formatTime(o.time)}` : ""}
                    {o.endTime ? ` – ${formatTime(o.endTime)}` : ""}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </div>
            ))}

          </div>
        )}
      </Link>
    </section>
  );
}
