import { z } from "zod";
import { optionalCoercedAccountId } from "./coerce-account-id";
import { INCOME_KIND_VALUES } from "@/lib/types/income-type";

export const createIncomeSchema = z.object({
  amount: z.number().int().positive(),
  type: z.enum(["salary", "ad_hoc"]),
  incomeKind: z.enum(INCOME_KIND_VALUES).optional(),
  description: z.string().max(500).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  accountId: optionalCoercedAccountId,
});

export const updateIncomeSchema = z.object({
  amount: z.number().int().positive().optional(),
  type: z.enum(["salary", "ad_hoc"]).optional(),
  incomeKind: z.enum(INCOME_KIND_VALUES).optional(),
  description: z.string().max(500).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  accountId: optionalCoercedAccountId,
});
