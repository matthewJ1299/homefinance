import { z } from "zod";
import { normalizeReminderSendTime } from "@/lib/utils/reminder-time";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
/** Accepts HH:mm from inputs; empty string from cleared time fields becomes null. */
const timeSchema = z
  .union([z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));
const recurrenceTypeSchema = z.enum(["none", "weekly", "monthly", "yearly"]);
const recurrenceDaySchema = z.number().int().min(1).max(31).optional().nullable();
/** @deprecated legacy single-reminder field; folded into `reminders` by the transforms. */
const reminderMinutesSchema = z.number().int().min(0).max(1440).optional().nullable();
const reminderSpecSchema = z.object({
  offsetMinutes: z.number().int().min(0).max(20160),
  sendTime: z
    .union([z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/), z.literal(""), z.null()])
    .optional()
    .transform((v) => normalizeReminderSendTime(v ?? null)),
});
const remindersSchema = z.array(reminderSpecSchema).max(10).optional();
const categoryIdSchema = z.number().int().positive().optional().nullable();

/**
 * Resolve the effective reminder set, honouring the legacy `reminderMinutes` fallback.
 * Returns `undefined` when the caller supplied neither field (so partial updates leave
 * existing reminders untouched).
 */
function resolveReminders(data: {
  reminders?: { offsetMinutes: number; sendTime: string | null }[];
  reminderMinutes?: number | null;
}): { offsetMinutes: number; sendTime: string | null }[] | undefined {
  if (data.reminders) return data.reminders;
  if (data.reminderMinutes != null) {
    return [{ offsetMinutes: data.reminderMinutes, sendTime: null }];
  }
  return undefined;
}

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
    reminders: remindersSchema,
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
    reminders: resolveReminders(data) ?? [],
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
    reminders: remindersSchema,
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
    const base = { ...data, reminders: resolveReminders(data) };
    if (data.recurrenceType != null && data.recurrenceType !== "none") {
      return { ...base, endDate: null };
    }
    return base;
  });

export const getCalendarEventsQuerySchema = z.object({
  start: dateSchema,
  end: dateSchema,
});
