"use client";

import { format, parseISO } from "date-fns";
import { MapPin, User, Users } from "lucide-react";
import { formatTime24 } from "@/lib/utils/format-time";
import type { CalendarEventOccurrence } from "@/lib/services/calendar.service";
import { occurrenceSegmentEnd } from "@/lib/utils/calendar-occurrence";

const PRIORITY_LABELS: Record<number, string> = {
  1: "Low",
  2: "Normal",
  3: "High",
  4: "Urgent",
};

function priorityClass(p: number): string {
  if (p >= 4) return "bg-destructive/20 text-destructive";
  if (p === 3) return "bg-orange-500/15 text-orange-600 dark:text-orange-400";
  return "bg-muted text-muted-foreground";
}

export function DaySchedule({
  occurrences,
  onSelectOccurrence,
}: {
  occurrences: CalendarEventOccurrence[];
  onSelectOccurrence?: (occurrence: CalendarEventOccurrence) => void;
}) {
  if (occurrences.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-muted/15 p-5 text-sm text-muted-foreground text-center">
        No events for this day.
      </div>
    );
  }

  const sorted = [...occurrences].sort((a, b) => {
    const tA = a.time ?? "";
    const tB = b.time ?? "";
    const tc = tA.localeCompare(tB);
    if (tc !== 0) return tc;
    return (b.priority ?? 2) - (a.priority ?? 2);
  });

  return (
    <div className="space-y-3">
      {sorted.map((o, idx) => {
        const barHex = o.categoryColor?.trim();
        const segEnd = occurrenceSegmentEnd(o);
        const multiDay = segEnd > o.date;
        const dateRangeLabel = multiDay
          ? `${format(parseISO(o.date), "MMM d")} – ${format(parseISO(segEnd), "MMM d")}`
          : null;
        const startLabel = formatTime24(o.time) || "All day";
        const endLabel = formatTime24(o.endTime);

        return (
          <button
            key={`${o.eventId}-${o.date}-${o.endDate ?? ""}-${o.time ?? "all"}-${idx}`}
            type="button"
            onClick={() => onSelectOccurrence?.(o)}
            className="flex w-full gap-0 text-left rounded-2xl border border-border/60 bg-card/80 overflow-hidden shadow-sm hover:bg-accent/15 transition-colors duration-200 cursor-pointer touch-manipulation"
          >
            <div className="flex w-[56px] shrink-0 flex-col items-end justify-center gap-0.5 py-3.5 pl-2 pr-1.5 text-[11px] tabular-nums text-muted-foreground">
              <span className="leading-tight">{startLabel}</span>
              {endLabel ? (
                <span className="leading-tight opacity-80">{endLabel}</span>
              ) : o.time ? (
                <span className="leading-tight opacity-0 select-none" aria-hidden>
                  --
                </span>
              ) : null}
            </div>
            <div
              className={`w-1 shrink-0 self-stretch min-h-[4.5rem] ${barHex ? "" : "bg-primary"}`}
              style={barHex ? { backgroundColor: barHex } : undefined}
              aria-hidden
            />
            <div className="min-w-0 flex-1 p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground truncate block max-w-full">
                      {o.name}
                    </span>
                    {dateRangeLabel ? (
                      <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                        {dateRangeLabel}
                      </span>
                    ) : null}
                    {(o.priority ?? 2) !== 2 ? (
                      <span
                        className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${priorityClass(o.priority ?? 2)}`}
                      >
                        {PRIORITY_LABELS[o.priority ?? 2] ?? "Normal"}
                      </span>
                    ) : null}
                  </div>
                  {o.notes ? (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
                      {o.notes}
                    </p>
                  ) : null}
                  {o.location ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                      <span className="truncate">{o.location}</span>
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 text-muted-foreground" title={o.isShared ? "Shared" : "Personal"}>
                  {o.isShared ? (
                    <Users className="h-4 w-4" aria-label="Shared with household" />
                  ) : (
                    <User className="h-4 w-4" aria-label="Personal event" />
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
