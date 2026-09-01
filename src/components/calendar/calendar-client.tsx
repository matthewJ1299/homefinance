"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { addDays, format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import type { SlotInfo } from "react-big-calendar";
import "./calendar.css";
import {
  EventFormDialog,
  type CalendarEventFormValues,
  buildCalendarEventApiBody,
} from "./event-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CalendarEventOccurrence } from "@/lib/services/calendar.service";
import { occurrenceSegmentEnd } from "@/lib/utils/calendar-occurrence";
import { toast } from "sonner";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEventWithDates {
  start: Date;
  end: Date;
  title: string;
  allDay?: boolean;
  resource: {
    eventId: number;
    date: string;
    endDate: string | null;
    time: string | null;
    endTime: string | null;
    name: string;
    location: string | null;
    notes: string | null;
    createdByName: string;
  };
}

function occurrenceToCalendarEvent(o: CalendarEventOccurrence): CalendarEventWithDates {
  const startDateStr = o.date;
  const endDateStr = occurrenceSegmentEnd(o);
  const timeStr = o.time;
  const allDay = !timeStr;
  const start = timeStr
    ? parse(`${startDateStr}T${timeStr}`, "yyyy-MM-dd'T'HH:mm", new Date())
    : parse(startDateStr, "yyyy-MM-dd", new Date());
  let end: Date;
  if (allDay) {
    end = addDays(parse(endDateStr, "yyyy-MM-dd", new Date()), 1);
  } else if (o.endTime) {
    end = parse(`${endDateStr}T${o.endTime}`, "yyyy-MM-dd'T'HH:mm", new Date());
  } else {
    end = new Date(start.getTime() + 60 * 60 * 1000);
  }
  return {
    start,
    end,
    title: o.name + (o.createdByName ? ` (${o.createdByName})` : ""),
    allDay,
    resource: {
      eventId: o.eventId,
      date: o.date,
      endDate: o.endDate,
      time: o.time,
      endTime: o.endTime,
      name: o.name,
      location: o.location,
      notes: o.notes,
      createdByName: o.createdByName,
    },
  };
}

function getMonthRange(date: Date): { start: string; end: string } {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const first = `${y}-${m}-01`;
  const lastDay = new Date(y, date.getMonth() + 1, 0).getDate();
  const last = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
  return { start: first, end: last };
}

export function CalendarClient() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const range = useMemo(() => getMonthRange(currentDate), [currentDate]);
  const [formOpen, setFormOpen] = useState(false);
  const [formDate, setFormDate] = useState<string | undefined>();
  const [formTime, setFormTime] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [initialFormValues, setInitialFormValues] = useState<CalendarEventFormValues | null>(null);

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
      if (ctx) {
        queryClient.setQueryData(ctx.key, ctx.previous);
      }
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
        (prev ?? []).map((o) => (o.eventId === id ? { ...o, ...body } as CalendarEventOccurrence : o))
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

  const events: CalendarEventWithDates[] = useMemo(
    () => occurrences.map(occurrenceToCalendarEvent),
    [occurrences]
  );

  const onRangeChange = useCallback((rangeOrDate: unknown) => {
    if (rangeOrDate instanceof Date) {
      setCurrentDate(rangeOrDate);
    } else if (Array.isArray(rangeOrDate) && rangeOrDate[0] instanceof Date) {
      setCurrentDate(rangeOrDate[0]);
    }
  }, []);

  const onSelectSlot = useCallback((slot: SlotInfo) => {
    setEditingEventId(null);
    setInitialFormValues(null);
    setFormDate(format(slot.start, "yyyy-MM-dd"));
    setFormTime(slot.action === "click" ? null : format(slot.start, "HH:mm"));
    setFormOpen(true);
  }, []);

  const onSelectEvent = useCallback(
    (event: CalendarEventWithDates) => {
      setEditingEventId(event.resource.eventId);
      setFormDate(event.resource.date);
      setFormTime(event.resource.time);
      setInitialFormValues(null);
      queryClient
        .fetchQuery({
          queryKey: ["calendar-event", event.resource.eventId],
          queryFn: async () => {
            const res = await fetch(`/api/calendar/events/${event.resource.eventId}`);
            if (!res.ok) throw new Error("Failed to fetch event");
            return res.json();
          },
        })
        .then((data: {
          name: string;
          location: string | null;
          date: string;
          endDate: string | null;
          time: string | null;
          endTime: string | null;
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
        })
        .catch(() => {
          setInitialFormValues({
            name: event.resource.name,
            location: event.resource.location,
            date: event.resource.date,
            endDate: event.resource.endDate ?? null,
            time: event.resource.time,
            endTime: event.resource.endTime ?? null,
            notes: event.resource.notes,
            recurrenceType: "none",
            recurrenceDayOfMonth: null,
            reminders: [],
            categoryId: null,
            isShared: true,
            priority: 2,
          });
          setFormOpen(true);
        });
    },
    [queryClient]
  );

  const handleFormSubmit = useCallback(
    async (values: Parameters<typeof buildCalendarEventApiBody>[0]) => {
      const body = buildCalendarEventApiBody(values);
      if (editingEventId != null) {
        await updateMutation.mutateAsync({ id: editingEventId, body });
      } else {
        await createMutation.mutateAsync(body);
      }
    },
    [editingEventId, updateMutation, createMutation]
  );

  const handleFormDelete = useCallback(
    async (eventId: number) => {
      await deleteMutation.mutateAsync(eventId);
    },
    [deleteMutation]
  );

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Calendar</h1>
        <Button
            type="button"
            onClick={() => {
              setEditingEventId(null);
              setInitialFormValues(null);
              setFormDate(new Date().toISOString().slice(0, 10));
              setFormTime(null);
              setFormOpen(true);
            }}
          >
            New event
          </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="calendar-theme min-h-[500px] rounded-lg border bg-card overflow-hidden">
            {isLoading ? (
              <p className="py-8 text-center text-muted-foreground">Loading events...</p>
            ) : (
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                titleAccessor="title"
                onRangeChange={onRangeChange}
                onSelectSlot={onSelectSlot}
                onSelectEvent={onSelectEvent}
                selectable
                defaultView="month"
                views={["month", "week", "day"]}
                style={{ height: 500 }}
                className="rounded-lg"
              />
            )}
          </div>
        </CardContent>
      </Card>
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
