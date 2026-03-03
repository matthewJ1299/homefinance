import { getMortgageRepository } from "@/lib/repositories";
import {
  generateSchedule,
  simulateSchedule,
  standardMonthlyPayment,
  calculateTopUp,
} from "./mortgage-calculator";
import type { MortgageParams } from "@/lib/types/mortgage.types";
import type { MortgageConfigRow, MortgageUserConfigRow, MortgagePaymentRow } from "@/lib/repositories/interfaces/mortgage.repository";

export class MortgageService {
  constructor(private repo = getMortgageRepository()) {}

  async getConfig() {
    const config = await this.repo.getActiveConfig();
    if (!config) {
      return { config: null, userConfigs: [] };
    }
    const userConfigs = await this.repo.getUserConfigs(config.id);
    return { config, userConfigs };
  }

  async saveConfig(data: {
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
  }) {
    const existing = await this.repo.getActiveConfig();
    const config = await this.repo.upsertConfig({
      propertyValue: data.propertyValue,
      loanAmount: data.loanAmount,
      annualInterestRate: data.annualInterestRate,
      loanTermMonths: data.loanTermMonths,
      startDate: data.startDate,
      targetEquityUserAPct: data.targetEquityUserAPct ?? 0.5,
    });
    for (const u of data.users) {
      await this.repo.upsertUserConfig(config.id, u.userId, {
        initialDeposit: u.initialDeposit,
        baseSplitPct: u.baseSplitPct,
        monthlyCap: u.monthlyCap ?? null,
      });
    }
    const scheduleResult = await this.getScheduleInternal(config.id);
    if (scheduleResult) {
      await this.repo.saveSnapshot({
        mortgageId: config.id,
        triggerEvent: existing ? "config_update" : "initial",
        scheduleJson: JSON.stringify(scheduleResult.schedule),
        projectedPayoffDate: scheduleResult.projectedPayoffDate,
        projectedMonths: scheduleResult.projectedMonths,
        monthlyTopup: scheduleResult.monthlyTopUp,
        userAFinalEquityPct: scheduleResult.userAFinalEquityPct,
        userBFinalEquityPct: scheduleResult.userBFinalEquityPct,
      });
    }
    return config;
  }

  private buildParams(
    config: MortgageConfigRow,
    userConfigs: MortgageUserConfigRow[]
  ): { params: MortgageParams; userAId: number; userBId: number } {
    const sorted = [...userConfigs].sort((a, b) => b.baseSplitPct - a.baseSplitPct);
    const userA = sorted[0];
    const userB = sorted[1];
    if (!userA || !userB) {
      throw new Error("Need exactly two user configs");
    }
    const monthlyRate = config.annualInterestRate / 12;
    const params: MortgageParams = {
      loanAmount: config.loanAmount,
      monthlyRate,
      termMonths: config.loanTermMonths,
      propertyValue: config.propertyValue,
      userA: {
        deposit: userA.initialDeposit,
        baseSplitPct: userA.baseSplitPct,
        monthlyCap: userA.monthlyCap,
      },
      userB: {
        deposit: userB.initialDeposit,
        baseSplitPct: userB.baseSplitPct,
        monthlyCap: userB.monthlyCap,
      },
    };
    return { params, userAId: userA.userId, userBId: userB.userId };
  }

  async getScheduleInternal(mortgageId: number) {
    const config = await this.repo.getActiveConfig();
    if (!config || config.id !== mortgageId) return null;
    const userConfigs = await this.repo.getUserConfigs(mortgageId);
    if (userConfigs.length < 2) return null;

    const { params, userAId, userBId } = this.buildParams(config, userConfigs);
    const payments = await this.repo.getPayments(mortgageId);
    const extraByMonth = new Map<number, number>();
    for (const p of payments.filter((x) => x.isExtraPayment)) {
      extraByMonth.set(p.monthNumber, (extraByMonth.get(p.monthNumber) ?? 0) + p.amount);
    }
    const getExtraPayment = (monthNumber: number) => extraByMonth.get(monthNumber) ?? 0;
    const targetEquityUserA = config.targetEquityUserAPct ?? 0.5;

    const result = generateSchedule(params, config.startDate, targetEquityUserA);
    const M = result.monthlyBasePayment;
    const userBBase = Math.min(
      Math.round(params.userB.baseSplitPct * M),
      params.userB.monthlyCap ?? Infinity
    );
    const monthlyPaymentUserA = M - userBBase + result.monthlyTopUp;
    const monthlyPaymentUserB = userBBase;
    const withExtras = simulateSchedule(
      params,
      M,
      userBBase,
      result.monthlyTopUp,
      config.startDate,
      getExtraPayment
    );

    const userAName = userConfigs.find((c) => c.userId === userAId)?.userName ?? "User A";
    const userBName = userConfigs.find((c) => c.userId === userBId)?.userName ?? "User B";
    const lastRow = withExtras.schedule[withExtras.schedule.length - 1];

    return {
      ...result,
      schedule: withExtras.schedule,
      projectedMonths: withExtras.months,
      projectedPayoffDate: lastRow?.date ?? config.startDate,
      monthlyPaymentUserA,
      monthlyPaymentUserB,
      targetEquityUserAPct: targetEquityUserA,
      equitySummary: {
        userA: {
          name: userAName,
          deposit: params.userA.deposit,
          totalPayments: withExtras.userATotalPayments,
          equityPct: lastRow?.userACumulativeEquityPct ?? 0.5,
        },
        userB: {
          name: userBName,
          deposit: params.userB.deposit,
          totalPayments: withExtras.userBTotalPayments,
          equityPct: lastRow?.userBCumulativeEquityPct ?? 0.5,
        },
      },
    };
  }

  async getSchedule() {
    const config = await this.repo.getActiveConfig();
    if (!config) return null;
    return this.getScheduleInternal(config.id);
  }

  async recordExtraPayment(
    userId: number,
    amount: number,
    paymentDate: string,
    note?: string | null
  ) {
    const config = await this.repo.getActiveConfig();
    if (!config) return null;

    const startDate = config.startDate;
    const [y, m] = startDate.slice(0, 7).split("-").map(Number);
    const paymentD = new Date(paymentDate + "T12:00:00");
    const startD = new Date(y, m - 1, 1);
    const monthNumber = Math.max(
      1,
      (paymentD.getFullYear() - startD.getFullYear()) * 12 +
        (paymentD.getMonth() - startD.getMonth()) +
        1
    );

    const id = await this.repo.insertPayment({
      mortgageId: config.id,
      userId,
      paymentDate,
      monthNumber,
      amount,
      principalPortion: amount,
      interestPortion: 0,
      isExtraPayment: true,
      note,
    });

    const scheduleResult = await this.getScheduleInternal(config.id);
    if (scheduleResult) {
      await this.repo.saveSnapshot({
        mortgageId: config.id,
        triggerEvent: "extra_payment",
        triggerPaymentId: id,
        scheduleJson: JSON.stringify(scheduleResult.schedule),
        projectedPayoffDate: scheduleResult.projectedPayoffDate,
        projectedMonths: scheduleResult.projectedMonths,
        monthlyTopup: scheduleResult.monthlyTopUp,
        userAFinalEquityPct: scheduleResult.userAFinalEquityPct,
        userBFinalEquityPct: scheduleResult.userBFinalEquityPct,
      });
    }
    return this.getSchedule();
  }
}
