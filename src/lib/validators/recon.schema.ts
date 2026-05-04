import { z } from "zod";
import { optionalCoercedAccountId } from "./coerce-account-id";

export const acceptAddSchema = z
  .object({
    /** Required when `entryKind` is `expense` (ignored for income). */
    categoryId: z.number().int().positive().optional(),
    accountId: optionalCoercedAccountId,
    split: z.boolean().optional(),
    /** If omitted, server uses the amount stored on the recon item (minor units). */
    amount: z.number().int().positive().max(9_999_999_999_999).optional(),
    /** If omitted, server uses default `Recon` / `Recon: {vendor}`. Empty string becomes no note. */
    note: z.string().max(500).optional(),
    entryKind: z.enum(["expense", "income"]).optional().default("expense"),
    incomeType: z.enum(["salary", "ad_hoc"]).optional().default("ad_hoc"),
  })
  .superRefine((data, ctx) => {
    if (data.entryKind === "expense") {
      if (data.categoryId == null || !Number.isFinite(data.categoryId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "categoryId is required for expense",
          path: ["categoryId"],
        });
      }
    }
    if (data.entryKind === "income" && data.split) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "split is not supported for income",
        path: ["split"],
      });
    }
  });
