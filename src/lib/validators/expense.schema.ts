import { z } from "zod";

export const createExpenseSchema = z.object({
  categoryId: z.number().int().positive(),
  amount: z.number().int().positive(),
  note: z.string().max(500).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const splitTypeSchema = z.enum(["equal", "full", "exact"]);

export const updateExpenseSchema = z
  .object({
    categoryId: z.number().int().positive().optional(),
    amount: z.number().int().positive().optional(),
    note: z.string().max(500).optional().nullable(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    splitType: splitTypeSchema.optional(),
    myShareCents: z.number().int().min(0).optional(),
    otherShareCents: z.number().int().min(0).optional(),
  })
  .refine(
    (data) => {
      if (data.splitType !== "exact") return true;
      const my = data.myShareCents ?? 0;
      const other = data.otherShareCents ?? 0;
      const total = data.amount ?? 0;
      return total > 0 && my + other === total;
    },
    { message: "My share + other share must equal total amount", path: ["myShareCents"] }
  );

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
