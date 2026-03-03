import { z } from "zod";

export const costTypeSchema = z.enum(["fixed", "variable"]);

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  groupName: z.string().min(1).max(100).trim(),
  costType: costTypeSchema.optional(),
  defaultAmount: z.number().int().min(0).nullable().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  groupName: z.string().min(1).max(100).trim().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  costType: costTypeSchema.optional(),
  defaultAmount: z.number().int().min(0).nullable().optional(),
});
