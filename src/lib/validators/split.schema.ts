import { z } from "zod";

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
});
export type SettleSplitInput = z.infer<typeof settleSplitSchema>;
