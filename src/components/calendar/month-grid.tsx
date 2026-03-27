"use client";

import { useMemo } from "react";
import { addDays, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import type { CalendarEventOccurrence } from "@/lib/services/calendar.service";
import { occurrenceCoversDate, occurrenceSegmentEnd } from "@/lib/utils/calendar-occurrence";
import { cn } from "@/lib/utils";

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function uniqueDotColors(occurrences: CalendarEventOccurrence[]): string[] {
  const colors: string[] = [];
  const seen = new Set<string>();
  for (const o of occurrences) {
    const c = o.categoryColor?.trim();
    if (c && !seen.has(c)) {
      seen.add(c);
      colors.push(c);
    }
    if (colors.length >= 3) break;
  }
  return colors;
}

function isSingleDayOccurrence(o: CalendarEventOccurrence): boolean {
  return !o.endDate || o.endDate <= o.date;
}

function singleDayEventsByDate(occurrences: CalendarEventOccurrence[]): Map<string, CalendarEventOccurrence[]> {
  const map = new Map<string, CalendarEventOccurrence[]>();
  for (const o of occurrences) {
    if (!isSingleDayOccurrence(o)) continue;
    if (!map.has(o.date)) map.set(o.date, []);
    map.get(o.date)!.push(o);
  }
  return map;
}

function multiDayOccurrences(occurrences: CalendarEventOccurrence[]): CalendarEventOccurrence[] {
  return occurrences.filter((o) => o.endDate != null && o.endDate > o.date);
}

type SpanningPill = {
  occurrence: CalendarEventOccurrence;
  colStart: number;
  colEnd: number;
  row: number;
};

function packSpanningPills(
  weekDates: string[],
  multi: CalendarEventOccurrence[]
): { pills: SpanningPill[]; rowCount: number } {
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];
  type Slot = { o: CalendarEventOccurrence; colStart: number; colEnd: number };
  const slots: Slot[] = [];

  for (const o of multi) {
    const segEnd = occurrenceSegmentEnd(o);
    if (o.date > weekEnd || segEnd < weekStart) continue;
    const visStart = o.date < weekStart ? weekStart : o.date;
    const visEnd = segEnd > weekEnd ? weekEnd : segEnd;
    const colStart = weekDates.indexOf(visStart);
    const colEnd = weekDates.indexOf(visEnd);
    if (colStart === -1 || colEnd === -1) continue;
    slots.push({ o, colStart, colEnd });
  }

  slots.sort((a, b) => {
    if (a.colStart !== b.colStart) return a.colStart - b.colStart;
    return b.colEnd - b.colStart - (a.colEnd - a.colStart);
  });

  const rowIntervals: [number, number][][] = [];
  const pills: SpanningPill[] = [];

  for (const s of slots) {
    let row = 0;
    for (;;) {
      const intervals = rowIntervals[row] ?? [];
      const clash = intervals.some(([rs, re]) => !(s.colEnd < rs || s.colStart > re));
      if (!clash) {
        if (!rowIntervals[row]) rowIntervals[row] = [];
        rowIntervals[row].push([s.colStart, s.colEnd]);
        pills.push({
          occurrence: s.o,
          colStart: s.colStart,
          colEnd: s.colEnd,
          row,
        });
        break;
      }
      row += 1;
    }
  }

  const rowCount = rowIntervals.length;
  return { pills, rowCount };
}

export function MonthGrid({
  currentDate,
  selectedDate,
  todayDate,
  occurrences,
  onSelectDate,
  onSelectSpanningOccurrence,
}: {
  currentDate: Date;
  selectedDate: string;
  todayDate: string;
  occurrences: CalendarEventOccurrence[];
  onSelectDate: (dateStr: string) => void;
  onSelectSpanningOccurrence?: (occurrence: CalendarEventOccurrence) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const singlesByDate = useMemo(() => singleDayEventsByDate(occurrences), [occurrences]);
  const multi = useMemo(() => multiDayOccurrences(occurrences), [occurrences]);

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="w-full space-y-2">
      <div className="grid w-full grid-cols-7 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {weekDays.map((d) => (
          <div key={d} className="min-w-0 text-center py-0.5">
            {d}
          </div>
        ))}
      </div>

      <div className="w-full space-y-1">
        {weeks.map((week, weekIdx) => {
          const weekDateStrs = week.map((d) => format(d, "yyyy-MM-dd"));
          const { pills, rowCount } = packSpanningPills(weekDateStrs, multi);
          const pillRowStyle =
            rowCount > 0
              ? ({ gridTemplateRows: `repeat(${rowCount}, 14px)` } as const)
              : undefined;

          return (
            <div key={`week-${weekIdx}`} className="w-full space-y-0.5">
              <div className="grid w-full grid-cols-7 gap-0.5 sm:gap-1 min-w-0">
                {week.map((d) => {
                  const dateStr = format(d, "yyyy-MM-dd");
                  const inMonth = isSameMonth(d, currentDate);
                  const isSelected = dateStr === selectedDate;
                  const isToday = dateStr === todayDate;
                  const dayEvents = singlesByDate.get(dateStr) ?? [];
                  const dotColors = uniqueDotColors(dayEvents);
                  const coveredByMulti = occurrences.some(
                    (o) => !isSingleDayOccurrence(o) && occurrenceCoversDate(o, dateStr)
                  );

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => onSelectDate(dateStr)}
                      className={cn(
                        "w-full min-w-0 h-[3.25rem] sm:h-14 flex flex-col items-center justify-center transition-colors rounded-xl sm:rounded-2xl cursor-pointer touch-manipulation bg-transparent",
                        inMonth && "hover:bg-muted/15",
                        !inMonth && "text-muted-foreground/45 hover:bg-muted/20",
                        isSelected && inMonth && "hover:bg-muted/20"
                      )}
                      aria-label={`Select ${dateStr}`}
                      aria-pressed={isSelected}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center text-sm font-semibold rounded-full transition-colors",
                          isSelected && "bg-primary text-primary-foreground shadow-sm",
                          !isSelected && isToday && inMonth && "text-primary",
                          !inMonth && "font-medium"
                        )}
                      >
                        {format(d, "d")}
                      </span>
                      <div className="mt-0.5 flex h-1.5 items-center justify-center gap-0.5">
                        {!coveredByMulti && dotColors.length === 0 && dayEvents.length > 0 ? (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        ) : !coveredByMulti ? (
                          dotColors.map((color, i) => (
                            <span
                              key={`${dateStr}-dot-${i}`}
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                          ))
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>

              {rowCount > 0 ? (
                <div
                  className="grid w-full min-w-0 grid-cols-7 gap-0.5 sm:gap-1"
                  style={pillRowStyle}
                >
                  {pills.map((p) => {
                    const hex = p.occurrence.categoryColor?.trim();
                    return (
                      <button
                        key={`${weekIdx}-${p.occurrence.eventId}-${p.occurrence.date}-r${p.row}`}
                        type="button"
                        style={{
                          gridColumn: `${p.colStart + 1} / ${p.colEnd + 2}`,
                          gridRow: p.row + 1,
                          ...(hex ? { backgroundColor: `${hex}D9` } : {}),
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSpanningOccurrence?.(p.occurrence);
                        }}
                        className={cn(
                          "min-h-3 rounded-full px-1.5 text-left text-[10px] font-medium leading-3 truncate cursor-pointer touch-manipulation transition-opacity hover:opacity-90 text-foreground",
                          !hex && "bg-primary/85 text-primary-foreground"
                        )}
                        title={p.occurrence.name}
                      >
                        {p.occurrence.name}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
