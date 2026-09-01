"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCalendarEventSchema } from "@/lib/validators/calendar-event.schema";
import {
  DEFAULT_REMINDER_SEND_TIME,
  offsetRequiresTime,
  reminderOffsetOptionsIncluding,
  normalizeReminderSendTime,
} from "@/lib/utils/reminder-time";

const formSchema = createCalendarEventSchema;
type FormValues = z.infer<typeof formSchema>;

const MAX_REMINDERS = 10;

const PRIORITY_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "Low" },
  { value: 2, label: "Normal" },
  { value: 3, label: "High" },
  { value: 4, label: "Urgent" },
];

/** Maps validated form values to the JSON body expected by calendar API routes. */
export function buildCalendarEventApiBody(values: FormValues): Record<string, unknown> {
  return {
    name: values.name,
    location: values.location ?? null,
    date: values.date,
    endDate:
      values.recurrenceType !== "none"
        ? null
        : values.endDate === "" || values.endDate == null
          ? null
          : values.endDate,
    time: values.time ?? null,
    endTime: values.endTime ?? null,
    notes: values.notes ?? null,
    recurrenceType: values.recurrenceType,
    recurrenceDayOfMonth:
      values.recurrenceDayOfMonth === undefined ||
      values.recurrenceDayOfMonth === null ||
      Number.isNaN(Number(values.recurrenceDayOfMonth))
        ? null
        : Number(values.recurrenceDayOfMonth),
    reminders: (values.reminders ?? []).map((r) => {
      const offsetMinutes = Number(r.offsetMinutes);
      return {
        offsetMinutes,
        sendTime: offsetRequiresTime(offsetMinutes)
          ? normalizeReminderSendTime(r.sendTime)
          : null,
      };
    }),
    categoryId: values.categoryId ?? null,
    isShared: values.isShared,
    priority: values.priority ?? 2,
  };
}

export interface CalendarEventFormValues {
  name: string;
  location: string | null;
  date: string;
  endDate: string | null;
  time: string | null;
  endTime: string | null;
  notes: string | null;
  recurrenceType: "none" | "weekly" | "monthly" | "yearly";
  recurrenceDayOfMonth: number | null;
  reminders: { offsetMinutes: number; sendTime: string | null }[];
  categoryId: number | null;
  isShared: boolean;
  priority: number;
}

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  defaultTime?: string | null;
  initialValues?: CalendarEventFormValues | null;
  eventId?: number | null;
  onSubmit: (values: FormValues) => Promise<void>;
  onDelete?: (eventId: number) => Promise<void>;
}

export function EventFormDialog({
  open,
  onOpenChange,
  defaultDate,
  defaultTime,
  initialValues,
  eventId,
  onSubmit,
  onDelete,
}: EventFormDialogProps) {
  const { data: categories = [] } = useQuery({
    queryKey: ["calendar-categories"],
    queryFn: async () => {
      const res = await fetch("/api/calendar/categories");
      if (!res.ok) throw new Error("Failed to load categories");
      return res.json() as Promise<{ id: number; name: string; color: string }[]>;
    },
    enabled: open,
    staleTime: 60_000,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      location: null,
      date: defaultDate ?? new Date().toISOString().slice(0, 10),
      endDate: null,
      time: defaultTime ?? null,
      endTime: null,
      notes: null,
      recurrenceType: "none",
      recurrenceDayOfMonth: null,
      reminders: [],
      categoryId: null,
      isShared: true,
      priority: 2,
    },
  });

  const { fields: reminderFields, append: appendReminder, remove: removeReminder } =
    useFieldArray({ control, name: "reminders" });

  const recurrenceType = watch("recurrenceType");
  const reminderValues = watch("reminders");

  useEffect(() => {
    if (open) {
      if (initialValues) {
        reset({
          name: initialValues.name,
          location: initialValues.location,
          date: initialValues.date,
          endDate: initialValues.endDate ?? null,
          time: initialValues.time,
          endTime: initialValues.endTime ?? null,
          notes: initialValues.notes,
          recurrenceType: initialValues.recurrenceType,
          recurrenceDayOfMonth: initialValues.recurrenceDayOfMonth,
          reminders: initialValues.reminders ?? [],
          categoryId: initialValues.categoryId ?? null,
          isShared: initialValues.isShared !== false,
          priority: initialValues.priority ?? 2,
        });
      } else {
        reset({
          name: "",
          location: null,
          date: defaultDate ?? new Date().toISOString().slice(0, 10),
          endDate: null,
          time: defaultTime ?? null,
          endTime: null,
          notes: null,
          recurrenceType: "none",
          recurrenceDayOfMonth: null,
          reminders: [],
          categoryId: null,
          isShared: true,
          priority: 2,
        });
      }
    }
  }, [open, initialValues, defaultDate, defaultTime, reset]);

  const handleFormSubmit = async (values: FormValues) => {
    await onSubmit(values);
    onOpenChange(false);
  };

  const handleDeleteClick = async () => {
    if (eventId == null || !onDelete) return;
    if (!confirm("Delete this event?")) return;
    await onDelete(eventId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <DialogHeader>{eventId != null ? "Edit event" : "New event"}</DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...register("name")} placeholder="Event name" />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="categoryId">Category</Label>
          <select
            id="categoryId"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            {...register("categoryId", {
              setValueAs: (v) => (v === "" || v === undefined ? null : Number(v)),
            })}
          >
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" {...register("location")} placeholder="Location" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Start date</Label>
          <Input id="date" type="date" {...register("date")} />
          {errors.date && (
            <p className="text-sm text-destructive">{errors.date.message}</p>
          )}
        </div>
        {recurrenceType === "none" && (
          <div className="space-y-2">
            <Label htmlFor="endDate">End date (optional)</Label>
            <Input id="endDate" type="date" {...register("endDate")} />
            <p className="text-xs text-muted-foreground">
              Leave empty for a single-day event. End date must be on or after the start date.
            </p>
            {errors.endDate && (
              <p className="text-sm text-destructive">{errors.endDate.message}</p>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="time">Start time</Label>
            <Input id="time" type="time" {...register("time")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime">End time</Label>
            <Input id="endTime" type="time" {...register("endTime")} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isShared"
            className="h-4 w-4 rounded border-input"
            {...register("isShared")}
          />
          <Label htmlFor="isShared" className="font-normal cursor-pointer">
            Shared with household (both users see this event)
          </Label>
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <select
            id="priority"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            {...register("priority", { valueAsNumber: true })}
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            {...register("notes")}
            placeholder="Notes"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="recurrenceType">Recurrence</Label>
          <select
            id="recurrenceType"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            {...register("recurrenceType")}
          >
            <option value="none">None</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Reminders</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={reminderFields.length >= MAX_REMINDERS}
              onClick={() =>
                appendReminder({ offsetMinutes: 0, sendTime: null })
              }
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Add reminder
            </Button>
          </div>
          {reminderFields.length === 0 && (
            <p className="text-xs text-muted-foreground">No reminders for this event.</p>
          )}
          {reminderFields.map((field, index) => {
            const currentOffset = Number(reminderValues?.[index]?.offsetMinutes ?? 0);
            const needsTime = offsetRequiresTime(currentOffset);
            const offsetRegister = register(`reminders.${index}.offsetMinutes` as const, {
              valueAsNumber: true,
            });
            return (
              <div key={field.id} className="flex items-start gap-2">
                <select
                  className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  {...offsetRegister}
                  onChange={(e) => {
                    void offsetRegister.onChange(e);
                    const mins = Number(e.target.value);
                    if (offsetRequiresTime(mins)) {
                      const current = getValues(`reminders.${index}.sendTime`);
                      if (!current) {
                        setValue(
                          `reminders.${index}.sendTime`,
                          DEFAULT_REMINDER_SEND_TIME
                        );
                      }
                    } else {
                      setValue(`reminders.${index}.sendTime`, null);
                    }
                  }}
                >
                  {reminderOffsetOptionsIncluding(currentOffset).map((opt) => (
                    <option key={opt.minutes} value={opt.minutes}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {needsTime && (
                  <Input
                    type="time"
                    className="w-32"
                    {...register(`reminders.${index}.sendTime` as const)}
                  />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeReminder(index)}
                  aria-label="Remove reminder"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">
            Minute-based reminders need an event start time. Day and week reminders send at the
            chosen time; leave the time empty to keep the old behaviour (event start minus the
            offset).
          </p>
        </div>
        {recurrenceType === "monthly" && (
          <div className="space-y-2">
            <Label htmlFor="recurrenceDayOfMonth">Day of month (1-31)</Label>
            <Input
              id="recurrenceDayOfMonth"
              type="number"
              min={1}
              max={31}
              {...register("recurrenceDayOfMonth", {
                setValueAs: (v) => {
                  if (v === "" || v === undefined) return null;
                  const n = parseInt(String(v), 10);
                  return Number.isNaN(n) ? null : n;
                },
              })}
            />
            {errors.recurrenceDayOfMonth && (
              <p className="text-sm text-destructive">
                {errors.recurrenceDayOfMonth.message}
              </p>
            )}
          </div>
        )}
        <DialogFooter>
          {eventId != null && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteClick}
              className="mr-auto"
            >
              Delete
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {eventId != null ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
