"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { setRequestContext } from "@/lib/db/request-context";
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
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContext({ userId: session.user.id, userName: session.user.name ?? undefined });
  const parsed = mortgageConfigSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };
  const config = { ...parsed.data };
  if (config.annualInterestRate > 1) {
    config.annualInterestRate = config.annualInterestRate / 100;
  }
  const service = new MortgageService();
  await service.saveConfig(config);
  revalidatePath("/mortgage");
  return { success: true };
}

export async function recordExtraPayment(data: {
  amount: number;
  paymentDate: string;
  note?: string | null;
}): Promise<MortgageActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContext({ userId: session.user.id, userName: session.user.name ?? undefined });
  const parsed = extraPaymentSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };
  const service = new MortgageService();
  const result = await service.recordExtraPayment(
    Number(session.user.id),
    parsed.data.amount,
    parsed.data.paymentDate,
    parsed.data.note
  );
  if (!result) return { success: false, error: "No mortgage configured" };
  revalidatePath("/mortgage");
  return { success: true };
}
