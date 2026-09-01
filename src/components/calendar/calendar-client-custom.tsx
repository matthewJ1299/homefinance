"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addMonths, format } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  EventFormDialog,
  buildCalendarEventApiBody,
  type CalendarEventFormValues,
} from "./event-form-dialog";
import type { CalendarEventOccurrence } from "@/lib/services/calendar.service";
import { occurrenceCoversDate } from "@/lib/utils/calendar-occurrence";
import { useMonthGridSwipeNavigation } from "@/hooks/use-month-grid-swipe-navigation";
import { MonthGrid } from "./month-grid";
import { DaySchedule } from "./day-schedule";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

const getTodayDateStr = () => format(new Date(), "yyyy-MM-dd");

function getMonthRange(date: Date): { start: string; end: string } {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const first = `${y}-${m}-01`;
  const lastDay = new Date(y, date.getMonth() + 1, 0).getDate();
  const last = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
  return { start: first, end: last };
}

export function CalendarClientCustom() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const range = useMemo(() => getMonthRange(currentDate), [currentDate]);

  const todayDate = useMemo(() => getTodayDateStr(), []);

  const [selectedDate, setSelectedDate] = useState<string>(() => todayDate);
  const [formOpen, setFormOpen] = useState(false);
  const [formDate, setFormDate] = useState<string | undefined>();
  const [formTime, setFormTime] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [initialFormValues, setInitialFormValues] = useState<CalendarEventFormValues | null>(null);

  useEffect(() => {
    if (selectedDate < range.start || selectedDate > range.end) {
      setSelectedDate(range.start);
    }
  }, [range.start, range.end, selectedDate]);

  const { data: occurrences = [], isLoading } = useQuery({
    queryKey: ["calendar-events", range.start, range.end],
    queryFn: async () => {
      const res = await fetch(
        `/api/calendar/events?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}`
      );
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json() as Promise<CalendarEventOccurrence[]>;
    },
  });

  const selectedOccurrences = useMemo(() => {
    return occurrences.filter((o) => occurrenceCoversDate(o, selectedDate));
  }, [occurrences, selectedDate]);

  const selectDay = useCallback((dateStr: string) => {
    setSelectedDate(dateStr);
  }, []);

  const openAddForDate = useCallback((dateStr: string) => {
    setSelectedDate(dateStr);
    setEditingEventId(null);
    setInitialFormValues(null);
    setFormDate(dateStr);
    setFormTime(null);
    setFormOpen(true);
  }, []);

  const openEditForOccurrence = useCallback(
    (occurrence: CalendarEventOccurrence) => {
      setEditingEventId(occurrence.eventId);
      setSelectedDate(occurrence.date);
      setFormDate(occurrence.date);
      setFormTime(occurrence.time);
      setInitialFormValues(null);

      queryClient
        .fetchQuery({
          queryKey: ["calendar-event", occurrence.eventId],
          queryFn: async () => {
            const res = await fetch(`/api/calendar/events/${occurrence.eventId}`);
            if (!res.ok) throw new Error("Failed to fetch event");
            return res.json();
          },
        })
        .then(
          (data: {
            name: string;
            location: string | null;
            date: string;
            time: string | null;
            endTime: string | null;
            endDate: string | null;
            notes: string | null;
            recurrenceType: "none" | "weekly" | "monthly" | "yearly";
            recurrenceDayOfMonth: number | null;
            reminders: { offsetMinutes: number; sendTime: string | null }[] | null;
            categoryId: number | null;
            isShared: boolean;
            priority: number;
          }) => {
            setInitialFormValues({
              name: data.name,
              location: data.location ?? null,
              date: data.date,
              endDate: data.endDate ?? null,
              time: data.time ?? null,
              endTime: data.endTime ?? null,
              notes: data.notes ?? null,
              recurrenceType: data.recurrenceType,
              recurrenceDayOfMonth: data.recurrenceDayOfMonth ?? null,
              reminders: data.reminders ?? [],
              categoryId: data.categoryId ?? null,
              isShared: data.isShared !== false,
              priority: typeof data.priority === "number" ? data.priority : 2,
            });
            setFormOpen(true);
          }
        )
        .catch(() => {
          setInitialFormValues({
            name: occurrence.name,
            location: occurrence.location,
            date: occurrence.date,
            endDate: occurrence.endDate ?? null,
            time: occurrence.time,
            endTime: occurrence.endTime ?? null,
            notes: occurrence.notes,
            recurrenceType: "none",
            recurrenceDayOfMonth: null,
            reminders: [],
            categoryId: occurrence.categoryId ?? null,
            isShared: occurrence.isShared,
            priority: occurrence.priority ?? 2,
          });
          setFormOpen(true);
        });
    },
    [queryClient]
  );

  const createMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create event");
      }
      const data = (await res.json().catch(() => ({}))) as { id?: number };
      return data.id as number | undefined;
    },
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: ["calendar-events"] });
      const tempId = -Date.now();
      const optimistic: CalendarEventOccurrence = {
        eventId: tempId,
        date: String(body.date ?? ""),
        endDate: (body.endDate as string | null | undefined) ?? null,
        time: (body.time as string | null | undefined) ?? null,
        endTime: (body.endTime as string | null | undefined) ?? null,
        name: String(body.name ?? "New event"),
        location: (body.location as string | null | undefined) ?? null,
        notes: (body.notes as string | null | undefined) ?? null,
        createdByUserId: 0,
        createdByName: "You",
        recurrenceType: String(body.recurrenceType ?? "none"),
        reminderMinutes: null,
        reminders: [],
        categoryId: (body.categoryId as number | null | undefined) ?? null,
        categoryName: null,
        categoryColor: null,
        isShared: (body.isShared as boolean | undefined) ?? true,
        priority: (body.priority as number | undefined) ?? 0,
      };
      const key = ["calendar-events", range.start, range.end] as const;
      const previous = queryClient.getQueryData<CalendarEventOccurrence[]>(key) ?? [];
      if (optimistic.date >= range.start && optimistic.date <= range.end) {
        queryClient.setQueryData<CalendarEventOccurrence[]>(key, [optimistic, ...previous]);
      }
      return { key, previous, tempId };
    },
    onError: (err, _body, ctx) => {
      if (ctx) queryClient.setQueryData(ctx.key, ctx.previous);
      toast.error(err instanceof Error ? err.message : "Failed to create event.");
    },
    onSuccess: (id, _body, ctx) => {
      toast.success("Event added.");
      if (ctx?.tempId != null && id != null) {
        queryClient.setQueryData<CalendarEventOccurrence[]>(ctx.key, (prev) =>
          (prev ?? []).map((o) => (o.eventId === ctx.tempId ? { ...o, eventId: id } : o))
        );
      }
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: Record<string, unknown> }) => {
      const res = await fetch(`/api/calendar/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update event");
      }
    },
    onMutate: async ({ id, body }) => {
      await queryClient.cancelQueries({ queryKey: ["calendar-events"] });
      const key = ["calendar-events", range.start, range.end] as const;
      const previous = queryClient.getQueryData<CalendarEventOccurrence[]>(key) ?? [];
      queryClient.setQueryData<CalendarEventOccurrence[]>(key, (prev) =>
        (prev ?? []).map((o) => (o.eventId === id ? ({ ...o, ...body } as CalendarEventOccurrence) : o))
      );
      return { key, previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx) queryClient.setQueryData(ctx.key, ctx.previous);
      toast.error(err instanceof Error ? err.message : "Failed to update event.");
    },
    onSuccess: () => {
      toast.success("Event updated.");
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/calendar/events/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete event");
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["calendar-events"] });
      const key = ["calendar-events", range.start, range.end] as const;
      const previous = queryClient.getQueryData<CalendarEventOccurrence[]>(key) ?? [];
      queryClient.setQueryData<CalendarEventOccurrence[]>(key, (prev) =>
        (prev ?? []).filter((o) => o.eventId !== id)
      );
      return { key, previous };
    },
    onError: (err, _id, ctx) => {
      if (ctx) queryClient.setQueryData(ctx.key, ctx.previous);
      toast.error(err instanceof Error ? err.message : "Failed to delete event.");
    },
    onSuccess: () => {
      toast.success("Event deleted.");
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });

  const handleFormSubmit = useCallback(
    async (values: Parameters<typeof buildCalendarEventApiBody>[0]) => {
      const body = buildCalendarEventApiBody(values);
      if (editingEventId != null) {
        await updateMutation.mutateAsync({ id: editingEventId, body });
      } else {
        await createMutation.mutateAsync(body);
      }
      void router.refresh();
    },
    [editingEventId, updateMutation, createMutation, router]
  );

  const handleFormDelete = useCallback(
    async (eventId: number) => {
      await deleteMutation.mutateAsync(eventId);
      void router.refresh();
    },
    [deleteMutation, router]
  );

  const scheduleTitle = format(new Date(selectedDate + "T12:00:00"), "MMM d");
  const monthLabel = format(currentDate, "MMMM yyyy");

  const goPrevMonth = useCallback(() => setCurrentDate((d) => addMonths(d, -1)), []);
  const goNextMonth = useCallback(() => setCurrentDate((d) => addMonths(d, 1)), []);

  const { monthGridSwipeProps } = useMonthGridSwipeNavigation({
    onPrevMonth: goPrevMonth,
    onNextMonth: goNextMonth,
  });

  return (
    <div className="relative p-4 pb-28 space-y-5">
      <h1 className="sr-only">Calendar</h1>

      <div className="flex items-center justify-center gap-3 pt-1">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="rounded-xl h-10 w-10 shrink-0 cursor-pointer"
          onClick={goPrevMonth}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-lg font-semibold tracking-tight min-w-[200px] text-center">
          {monthLabel}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="rounded-xl h-10 w-10 shrink-0 cursor-pointer"
          onClick={goNextMonth}
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <Card className="border-border/60 bg-card/90 shadow-md rounded-2xl overflow-hidden">
        <CardContent className="pt-5 pb-6 space-y-6">
          <div
            className="w-full min-w-0 rounded-2xl border border-border/50 bg-background/35 px-2 py-3 sm:px-3 sm:py-4"
            {...monthGridSwipeProps}
          >
            <MonthGrid
              currentDate={currentDate}
              selectedDate={selectedDate}
              todayDate={todayDate}
              occurrences={occurrences}
              onSelectDate={selectDay}
              onSelectSpanningOccurrence={openEditForOccurrence}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold tracking-tight">
                Schedule for {scheduleTitle}
              </h2>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => openAddForDate(selectedDate)}
                className="gap-2 rounded-xl cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>

            {isLoading ? (
              <p className="text-center text-muted-foreground py-6">Loading events...</p>
            ) : (
              <DaySchedule occurrences={selectedOccurrences} onSelectOccurrence={openEditForOccurrence} />
            )}
          </div>
        </CardContent>
      </Card>

      <Button
        type="button"
        size="icon"
        className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full shadow-xl cursor-pointer transition-transform duration-200 active:scale-95 md:bottom-8"
        onClick={() => openAddForDate(selectedDate)}
        aria-label="Add event"
      >
        <Plus className="h-7 w-7" />
      </Button>

      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultDate={formDate}
        defaultTime={formTime}
        initialValues={initialFormValues}
        eventId={editingEventId}
        onSubmit={handleFormSubmit}
        onDelete={editingEventId != null ? handleFormDelete : undefined}
      />
    </div>
  );
}
