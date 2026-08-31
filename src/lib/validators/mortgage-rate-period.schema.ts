import { z } from "zod";

export const mortgageRatePeriodSchema = z.object({
  effectiveFromMonth: z.number().int().min(1),
  annualInterestRate: z.number().min(0.001).max(100),
});

export const mortgageRatePeriodsSchema = z.object({
  periods: z.array(mortgageRatePeriodSchema).max(50),
});
