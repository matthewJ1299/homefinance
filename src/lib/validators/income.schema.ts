import { z } from "zod";

export const createIncomeSchema = z.object({
  amount: z.number().int().positive(),
  type: z.enum(["salary", "ad_hoc"]),
  description: z.string().max(500).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const updateIncomeSchema = z.object({
  amount: z.number().int().positive().optional(),
  type: z.enum(["salary", "ad_hoc"]).optional(),
  description: z.string().max(500).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
