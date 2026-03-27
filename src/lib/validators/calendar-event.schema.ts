import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
/** Accepts HH:mm from inputs; empty string from cleared time fields becomes null. */
const timeSchema = z
  .union([z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));
const recurrenceTypeSchema = z.enum(["none", "weekly", "monthly", "yearly"]);
const recurrenceDaySchema = z.number().int().min(1).max(31).optional().nullable();
const reminderMinutesSchema = z.number().int().min(0).max(1440).optional().nullable();
const categoryIdSchema = z.number().int().positive().optional().nullable();

const optionalEndDateSchema = z
  .union([dateSchema, z.literal(""), z.null()])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

export const createCalendarEventSchema = z
  .object({
    name: z.string().min(1).max(500),
    location: z.string().max(500).optional().nullable(),
    date: dateSchema,
    endDate: optionalEndDateSchema,
    time: timeSchema,
    endTime: timeSchema,
    notes: z.string().max(2000).optional().nullable(),
    recurrenceType: recurrenceTypeSchema,
    recurrenceDayOfMonth: recurrenceDaySchema,
    reminderMinutes: reminderMinutesSchema,
    categoryId: categoryIdSchema,
    isShared: z.boolean().optional().default(true),
    priority: z.number().int().min(1).max(4).default(2),
  })
  .superRefine((data, ctx) => {
    if (data.endDate && data.endDate < data.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be on or after start date.",
      });
    }
  })
  .transform((data) => ({
    ...data,
    endDate: data.recurrenceType !== "none" ? null : data.endDate ?? null,
  }));

export const updateCalendarEventSchema = z
  .object({
    name: z.string().min(1).max(500).optional(),
    location: z.string().max(500).optional().nullable(),
    date: dateSchema.optional(),
    endDate: optionalEndDateSchema,
    time: timeSchema,
    endTime: timeSchema,
    notes: z.string().max(2000).optional().nullable(),
    recurrenceType: recurrenceTypeSchema.optional(),
    recurrenceDayOfMonth: recurrenceDaySchema,
    reminderMinutes: reminderMinutesSchema,
    categoryId: categoryIdSchema,
    isShared: z.boolean().optional(),
    priority: z.number().int().min(1).max(4).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.endDate && data.date && data.endDate < data.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be on or after start date.",
      });
    }
  })
  .transform((data) => {
    if (data.recurrenceType != null && data.recurrenceType !== "none") {
      return { ...data, endDate: null };
    }
    return data;
  });

export const getCalendarEventsQuerySchema = z.object({
  start: dateSchema,
  end: dateSchema,
});
