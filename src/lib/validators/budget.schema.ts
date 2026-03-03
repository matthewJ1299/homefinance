import { z } from "zod";

export const allocateSchema = z.object({
  categoryId: z.number().int().positive(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  amount: z.number().int().min(0),
});

export const transferSchema = z.object({
  fromCategoryId: z.number().int().positive(),
  toCategoryId: z.number().int().positive(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  amount: z.number().int().positive(),
  reason: z.string().max(500).optional().nullable(),
});
