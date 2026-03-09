import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable();
const recurrenceTypeSchema = z.enum(["none", "weekly", "monthly", "yearly"]);
const recurrenceDaySchema = z.number().int().min(1).max(31).optional().nullable();

export const createCalendarEventSchema = z.object({
  name: z.string().min(1).max(500),
  location: z.string().max(500).optional().nullable(),
  date: dateSchema,
  time: timeSchema,
  notes: z.string().max(2000).optional().nullable(),
  recurrenceType: recurrenceTypeSchema,
  recurrenceDayOfMonth: recurrenceDaySchema,
});

export const updateCalendarEventSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  location: z.string().max(500).optional().nullable(),
  date: dateSchema.optional(),
  time: timeSchema,
  notes: z.string().max(2000).optional().nullable(),
  recurrenceType: recurrenceTypeSchema.optional(),
  recurrenceDayOfMonth: recurrenceDaySchema,
});

export const getCalendarEventsQuerySchema = z.object({
  start: dateSchema,
  end: dateSchema,
});
