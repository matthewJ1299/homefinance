import { z } from "zod";
import { optionalCoercedAccountId } from "./coerce-account-id";

export const acceptAddSchema = z.object({
  categoryId: z.number().int().positive(),
  accountId: optionalCoercedAccountId,
  split: z.boolean().optional(),
  /** If omitted, server uses the amount stored on the recon item (minor units). */
  amount: z.number().int().positive().max(9_999_999_999_999).optional(),
  /** If omitted, server uses default `Recon` / `Recon: {vendor}`. Empty string becomes no note. */
  note: z.string().max(500).optional(),
});
