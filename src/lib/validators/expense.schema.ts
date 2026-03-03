import { z } from "zod";

export const createExpenseSchema = z.object({
  categoryId: z.number().int().positive(),
  amount: z.number().int().positive(),
  note: z.string().max(500).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const updateExpenseSchema = z.object({
  categoryId: z.number().int().positive().optional(),
  amount: z.number().int().positive().optional(),
  note: z.string().max(500).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
