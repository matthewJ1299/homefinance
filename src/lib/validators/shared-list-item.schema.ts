import { z } from "zod";

export const createSharedListItemSchema = z.object({
  listId: z.number().int().positive(),
  label: z.string().min(1).max(500).trim(),
  quantity: z.number().int().min(1).optional(),
});

export const updateSharedListItemSchema = z.object({
  label: z.string().min(1).max(500).trim().optional(),
  quantity: z.number().int().min(1).optional(),
  completed: z.boolean().optional(),
});
