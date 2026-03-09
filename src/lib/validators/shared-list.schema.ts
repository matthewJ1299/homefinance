import { z } from "zod";

export const createSharedListSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateSharedListSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  sortOrder: z.number().int().min(0).optional(),
});
