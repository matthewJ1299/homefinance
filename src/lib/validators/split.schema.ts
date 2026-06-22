import { z } from "zod";
import { optionalCoercedAccountId } from "./coerce-account-id";

export const splitTypeSchema = z.enum(["equal", "full", "exact"]);

export const createSplitExpenseSchema = z
  .object({
    categoryId: z.number().int().positive(),
    totalAmountCents: z.number().int().positive(),
    note: z.string().max(500).optional().nullable(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    splitType: splitTypeSchema,
    myShareCents: z.number().int().min(0).optional(),
    otherShareCents: z.number().int().min(0).optional(),
    groupId: z.number().int().positive().optional().nullable(),
    accountId: optionalCoercedAccountId,
  })
  .refine(
    (data) => {
      if (data.splitType !== "exact") return true;
      const my = data.myShareCents ?? 0;
      const other = data.otherShareCents ?? 0;
      return my + other === data.totalAmountCents;
    },
    { message: "My share + other share must equal total amount", path: ["myShareCents"] }
  );

export type CreateSplitExpenseInput = z.infer<typeof createSplitExpenseSchema>;

export const settleSplitSchema = z.object({
  recipientUserId: z.number().int().positive(),
  amountCents: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  groupId: z.number().int().positive(),
});
export type SettleSplitInput = z.infer<typeof settleSplitSchema>;

export const updateSettlementSchema = z.object({
  settlementId: z.number().int().positive(),
  amountCents: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type UpdateSettlementInput = z.infer<typeof updateSettlementSchema>;

export const deleteSettlementSchema = z.object({
  settlementId: z.number().int().positive(),
});
export type DeleteSettlementInput = z.infer<typeof deleteSettlementSchema>;
