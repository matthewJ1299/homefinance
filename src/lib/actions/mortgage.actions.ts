"use server";

import { revalidatePath } from "next/cache";
import { authedAction } from "@/lib/actions/_shared/authed-action";
import { MortgageService } from "@/lib/services/mortgage.service";
import { mortgageConfigSchema, extraPaymentSchema } from "@/lib/validators/mortgage.schema";

export type MortgageActionResult =
  | { success: true }
  | { success: false; error: string };

export async function saveMortgageConfig(data: {
  propertyValue: number;
  loanAmount: number;
  annualInterestRate: number;
  loanTermMonths: number;
  startDate: string;
  targetEquityUserAPct?: number | null;
  users: Array<{
    userId: number;
    initialDeposit: number;
    baseSplitPct: number;
    monthlyCap?: number;
  }>;
}): Promise<MortgageActionResult> {
  return authedAction<MortgageActionResult>(async () => {
    const parsed = mortgageConfigSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.message };
    const config = { ...parsed.data };
    if (config.annualInterestRate > 1) {
      config.annualInterestRate = config.annualInterestRate / 100;
    }
    await new MortgageService().saveConfig(config);
    revalidatePath("/mortgage");
    return { success: true };
  }, { onError: "The mortgage settings didn't save. Try again." });
}

export async function recordExtraPayment(data: {
  amount: number;
  paymentDate: string;
  note?: string | null;
}): Promise<MortgageActionResult> {
  return authedAction<MortgageActionResult>(async ({ userId }) => {
    const parsed = extraPaymentSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.message };
    const result = await new MortgageService().recordExtraPayment(
      userId,
      parsed.data.amount,
      parsed.data.paymentDate,
      parsed.data.note
    );
    if (!result) return { success: false, error: "No mortgage configured" };
    revalidatePath("/mortgage");
    return { success: true };
  }, { onError: "That payment wasn't recorded. Try again." });
}

export async function saveMortgageRatePeriods(data: {
  periods: Array<{ effectiveFromMonth: number; annualInterestRate: number }>;
}): Promise<MortgageActionResult> {
  return authedAction<MortgageActionResult>(async () => {
    const { mortgageRatePeriodsSchema } = await import(
      "@/lib/validators/mortgage-rate-period.schema"
    );
    const parsed = mortgageRatePeriodsSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.message };

    const sorted = [...parsed.data.periods].sort(
      (a, b) => a.effectiveFromMonth - b.effectiveFromMonth
    );
    const seen = new Set<number>();
    for (const period of sorted) {
      if (seen.has(period.effectiveFromMonth)) {
        return { success: false, error: "Each loan month can only have one rate change." };
      }
      seen.add(period.effectiveFromMonth);
    }

    await new MortgageService().saveRatePeriods(sorted);
    revalidatePath("/mortgage");
    return { success: true };
  }, { onError: "The rate changes didn't save. Try again." });
}
