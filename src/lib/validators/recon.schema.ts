import { z } from "zod";
import { optionalCoercedAccountId } from "./coerce-account-id";

export const acceptAddSchema = z.object({
  categoryId: z.number().int().positive(),
  accountId: optionalCoercedAccountId,
  split: z.boolean().optional(),
});
