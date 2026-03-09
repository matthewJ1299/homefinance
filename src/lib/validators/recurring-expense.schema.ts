import { z } from "zod";

export const createRecurringExpenseSchema = z.object({
  categoryId: z.number().int().positive(),
  amount: z.number().int().positive(),
  note: z.string().max(500).optional().nullable(),
  dayOfMonth: z.number().int().min(1).max(31),
});

export const updateRecurringExpenseSchema = z.object({
  categoryId: z.number().int().positive().optional(),
  amount: z.number().int().positive().optional(),
  note: z.string().max(500).optional().nullable(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
});
