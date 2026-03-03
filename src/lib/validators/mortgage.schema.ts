import { z } from "zod";

export const mortgageConfigSchema = z.object({
  propertyValue: z.number().int().positive(),
  loanAmount: z.number().int().positive(),
  annualInterestRate: z.number().min(0.001).max(100),
  loanTermMonths: z.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  targetEquityUserAPct: z.number().min(0).max(1).optional(),
  users: z.array(
    z.object({
      userId: z.number().int().positive(),
      initialDeposit: z.number().int().min(0),
      baseSplitPct: z.number().min(0).max(1),
      monthlyCap: z.number().int().positive().optional(),
    })
  ).length(2),
});

export const extraPaymentSchema = z.object({
  amount: z.number().int().positive(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500).optional().nullable(),
});
