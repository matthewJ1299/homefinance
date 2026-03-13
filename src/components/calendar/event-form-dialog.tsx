"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCalendarEventSchema } from "@/lib/validators/calendar-event.schema";

const formSchema = createCalendarEventSchema;
type FormValues = z.infer<typeof formSchema>;

const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "None" },
  { value: 0, label: "At event time" },
  { value: 5, label: "5 minutes before" },
  { value: 10, label: "10 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 120, label: "2 hours before" },
  { value: 1440, label: "1 day before" },
];

export interface CalendarEventFormValues {
  name: string;
  location: string | null;
  date: string;
  time: string | null;
  notes: string | null;
  recurrenceType: "none" | "weekly" | "monthly" | "yearly";
  recurrenceDayOfMonth: number | null;
  reminderMinutes: number | null;
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
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      location: null,
      date: defaultDate ?? new Date().toISOString().slice(0, 10),
      time: defaultTime ?? null,
      notes: null,
      recurrenceType: "none",
      recurrenceDayOfMonth: null,
      reminderMinutes: null,
    },
  });

  const recurrenceType = watch("recurrenceType");

  useEffect(() => {
    if (open) {
      if (initialValues) {
        reset({
          name: initialValues.name,
          location: initialValues.location,
          date: initialValues.date,
          time: initialValues.time,
          notes: initialValues.notes,
          recurrenceType: initialValues.recurrenceType,
          recurrenceDayOfMonth: initialValues.recurrenceDayOfMonth,
          reminderMinutes: initialValues.reminderMinutes ?? null,
        });
      } else {
        reset({
          name: "",
          location: null,
          date: defaultDate ?? new Date().toISOString().slice(0, 10),
          time: defaultTime ?? null,
          notes: null,
          recurrenceType: "none",
          recurrenceDayOfMonth: null,
          reminderMinutes: null,
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
          <Label htmlFor="location">Location</Label>
          <Input id="location" {...register("location")} placeholder="Location" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" {...register("date")} />
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <Input id="time" type="time" {...register("time")} />
          </div>
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
          <Label htmlFor="reminderMinutes">Reminder</Label>
          <select
            id="reminderMinutes"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            {...register("reminderMinutes", {
              setValueAs: (v) => {
                if (v === "" || v === undefined) return null;
                const n = parseInt(String(v), 10);
                return Number.isNaN(n) ? null : n;
              },
            })}
          >
            {REMINDER_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value ?? ""}>
                {opt.label}
              </option>
            ))}
          </select>
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
