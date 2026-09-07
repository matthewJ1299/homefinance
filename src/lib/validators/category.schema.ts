import { z } from "zod";

export const costTypeSchema = z.enum(["fixed", "variable"]);

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  groupName: z.string().min(1).max(100).trim(),
  costType: costTypeSchema.optional(),
  defaultAmount: z.number().int().min(0).nullable().optional(),
  rollover: z.boolean().optional(),
  /** Set makes this category a goal. Null clears it back to a plain category. */
  targetMinor: z.number().int().min(0).nullable().optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  groupName: z.string().min(1).max(100).trim().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  costType: costTypeSchema.optional(),
  defaultAmount: z.number().int().min(0).nullable().optional(),
  // The action and the repository have always accepted these three; leaving
  // them out here meant zod stripped them, the update ended up empty, and
  // `updateCategory` answered success without writing anything. Setting a goal
  // target reported "saving towards R10 000,00" and changed nothing.
  rollover: z.boolean().optional(),
  targetMinor: z.number().int().min(0).nullable().optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});
