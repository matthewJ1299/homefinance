import { z } from "zod";

export const createSplitGroupSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateSplitGroupSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});
