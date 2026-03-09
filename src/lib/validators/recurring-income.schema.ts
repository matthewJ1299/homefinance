import { z } from "zod";

export const recurringIncomeTypeSchema = z.enum(["salary", "ad_hoc"]);

export const createRecurringIncomeSchema = z.object({
  amount: z.number().int().positive(),
  type: recurringIncomeTypeSchema,
  description: z.string().max(500).optional().nullable(),
  dayOfMonth: z.number().int().min(1).max(31),
});

export const updateRecurringIncomeSchema = z.object({
  amount: z.number().int().positive().optional(),
  type: recurringIncomeTypeSchema.optional(),
  description: z.string().max(500).optional().nullable(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
});
