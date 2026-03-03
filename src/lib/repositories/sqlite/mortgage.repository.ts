import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  mortgageConfigs,
  mortgageUserConfigs,
  mortgagePayments,
  mortgageScheduleSnapshots,
  users,
} from "@/lib/db/schema";
import type { IMortgageRepository } from "../interfaces/mortgage.repository";

export class MortgageRepository implements IMortgageRepository {
  async getActiveConfig() {
    const [row] = await db
      .select()
      .from(mortgageConfigs)
      .where(eq(mortgageConfigs.isActive, true))
      .limit(1);
    if (!row) return null;
    return {
      id: row.id,
      propertyValue: row.propertyValue,
      loanAmount: row.loanAmount,
      annualInterestRate: row.annualInterestRate,
      loanTermMonths: row.loanTermMonths,
      startDate: row.startDate,
      targetEquityUserAPct: row.targetEquityUserAPct ?? 0.5,
    };
  }

  async getUserConfigs(mortgageId: number) {
    const rows = await db
      .select({
        userId: mortgageUserConfigs.userId,
        userName: users.name,
        initialDeposit: mortgageUserConfigs.initialDeposit,
        baseSplitPct: mortgageUserConfigs.baseSplitPct,
        monthlyCap: mortgageUserConfigs.monthlyCap,
      })
      .from(mortgageUserConfigs)
      .innerJoin(users, eq(mortgageUserConfigs.userId, users.id))
      .where(eq(mortgageUserConfigs.mortgageId, mortgageId));
    return rows;
  }

  async upsertConfig(data: {
    propertyValue: number;
    loanAmount: number;
    annualInterestRate: number;
    loanTermMonths: number;
    startDate: string;
  }) {
    const existing = await this.getActiveConfig();
    if (existing) {
      const updates: Record<string, unknown> = {
        propertyValue: data.propertyValue,
        loanAmount: data.loanAmount,
        annualInterestRate: data.annualInterestRate,
        loanTermMonths: data.loanTermMonths,
        startDate: data.startDate,
      };
      if (data.targetEquityUserAPct !== undefined) {
        updates.targetEquityUserAPct = data.targetEquityUserAPct;
      }
      await db.update(mortgageConfigs).set(updates).where(eq(mortgageConfigs.id, existing.id));
      return { ...existing, ...data };
    }
    const [inserted] = await db
      .insert(mortgageConfigs)
      .values({
        propertyValue: data.propertyValue,
        loanAmount: data.loanAmount,
        annualInterestRate: data.annualInterestRate,
        loanTermMonths: data.loanTermMonths,
        startDate: data.startDate,
        targetEquityUserAPct: data.targetEquityUserAPct ?? 0.5,
      })
      .returning();
    return {
      id: inserted!.id,
      propertyValue: inserted!.propertyValue,
      loanAmount: inserted!.loanAmount,
      annualInterestRate: inserted!.annualInterestRate,
      loanTermMonths: inserted!.loanTermMonths,
      startDate: inserted!.startDate,
      targetEquityUserAPct: inserted!.targetEquityUserAPct ?? 0.5,
    };
  }

  async upsertUserConfig(
    mortgageId: number,
    userId: number,
    data: { initialDeposit: number; baseSplitPct: number; monthlyCap?: number | null }
  ) {
    await db
      .insert(mortgageUserConfigs)
      .values({
        mortgageId,
        userId,
        initialDeposit: data.initialDeposit,
        baseSplitPct: data.baseSplitPct,
        monthlyCap: data.monthlyCap ?? null,
      })
      .onConflictDoUpdate({
        target: [mortgageUserConfigs.mortgageId, mortgageUserConfigs.userId],
        set: {
          initialDeposit: data.initialDeposit,
          baseSplitPct: data.baseSplitPct,
          monthlyCap: data.monthlyCap ?? null,
        },
      });
  }

  async getPayments(mortgageId: number) {
    const rows = await db
      .select()
      .from(mortgagePayments)
      .where(eq(mortgagePayments.mortgageId, mortgageId))
      .orderBy(mortgagePayments.monthNumber);
    return rows.map((r) => ({
      id: r.id,
      mortgageId: r.mortgageId,
      userId: r.userId,
      paymentDate: r.paymentDate,
      monthNumber: r.monthNumber,
      amount: r.amount,
      principalPortion: r.principalPortion,
      interestPortion: r.interestPortion,
      isExtraPayment: r.isExtraPayment,
      note: r.note,
      createdAt: r.createdAt,
    }));
  }

  async insertPayment(data: {
    mortgageId: number;
    userId: number;
    paymentDate: string;
    monthNumber: number;
    amount: number;
    principalPortion: number;
    interestPortion: number;
    isExtraPayment: boolean;
    note?: string | null;
  }) {
    const [inserted] = await db
      .insert(mortgagePayments)
      .values({
        mortgageId: data.mortgageId,
        userId: data.userId,
        paymentDate: data.paymentDate,
        monthNumber: data.monthNumber,
        amount: data.amount,
        principalPortion: data.principalPortion,
        interestPortion: data.interestPortion,
        isExtraPayment: data.isExtraPayment,
        note: data.note ?? null,
      })
      .returning({ id: mortgagePayments.id });
    return inserted!.id;
  }

  async saveSnapshot(data: {
    mortgageId: number;
    triggerEvent: string;
    triggerPaymentId?: number | null;
    scheduleJson: string;
    projectedPayoffDate: string;
    projectedMonths: number;
    monthlyTopup: number;
    userAFinalEquityPct: number;
    userBFinalEquityPct: number;
  }) {
    await db.insert(mortgageScheduleSnapshots).values({
      mortgageId: data.mortgageId,
      triggerEvent: data.triggerEvent as "initial" | "extra_payment" | "recalculation" | "config_update",
      triggerPaymentId: data.triggerPaymentId ?? null,
      scheduleJson: data.scheduleJson,
      projectedPayoffDate: data.projectedPayoffDate,
      projectedMonths: data.projectedMonths,
      monthlyTopup: data.monthlyTopup,
      userAFinalEquityPct: data.userAFinalEquityPct,
      userBFinalEquityPct: data.userBFinalEquityPct,
    });
  }
}
