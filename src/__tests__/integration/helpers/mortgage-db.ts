import { run } from "@/lib/db";
import { getMortgageRepository } from "@/lib/repositories";
import type {
  MortgageConfigRow,
  MortgagePaymentRow,
  MortgageUserConfigRow,
} from "@/lib/repositories/interfaces/mortgage.repository";

export type MortgageDbSnapshot = {
  config: MortgageConfigRow;
  userConfigs: MortgageUserConfigRow[];
  payments: MortgagePaymentRow[];
  ratePeriods: Array<{
    effectiveFromMonth: number;
    annualInterestRate: number;
  }>;
};

export async function snapshotMortgage(): Promise<MortgageDbSnapshot | null> {
  const repo = getMortgageRepository();
  const config = await repo.getActiveConfig();
  if (!config) return null;

  return {
    config,
    userConfigs: await repo.getUserConfigs(config.id),
    payments: await repo.getPayments(config.id),
    ratePeriods: (await repo.getRatePeriods(config.id)).map((period) => ({
      effectiveFromMonth: period.effectiveFromMonth,
      annualInterestRate: period.annualInterestRate,
    })),
  };
}

export async function wipeMortgageLedger(mortgageId: number): Promise<void> {
  await run("DELETE FROM mortgage_schedule_snapshots WHERE mortgage_id = ?", [mortgageId]);
  await run("DELETE FROM mortgage_payments WHERE mortgage_id = ?", [mortgageId]);
  await run("DELETE FROM mortgage_rate_periods WHERE mortgage_id = ?", [mortgageId]);
}

export async function restoreMortgageSnapshot(snapshot: MortgageDbSnapshot): Promise<void> {
  const repo = getMortgageRepository();
  await wipeMortgageLedger(snapshot.config.id);

  await repo.upsertConfig({
    propertyValue: snapshot.config.propertyValue,
    loanAmount: snapshot.config.loanAmount,
    annualInterestRate: snapshot.config.annualInterestRate,
    loanTermMonths: snapshot.config.loanTermMonths,
    startDate: snapshot.config.startDate,
    targetEquityUserAPct: snapshot.config.targetEquityUserAPct,
  });

  for (const user of snapshot.userConfigs) {
    await repo.upsertUserConfig(snapshot.config.id, user.userId, {
      initialDeposit: user.initialDeposit,
      baseSplitPct: user.baseSplitPct,
      monthlyCap: user.monthlyCap,
    });
  }

  for (const payment of snapshot.payments) {
    await repo.insertPayment({
      mortgageId: snapshot.config.id,
      userId: payment.userId,
      paymentDate: payment.paymentDate,
      monthNumber: payment.monthNumber,
      amount: payment.amount,
      principalPortion: payment.principalPortion,
      interestPortion: payment.interestPortion,
      isExtraPayment: payment.isExtraPayment,
      note: payment.note,
    });
  }

  await repo.replaceRatePeriods(snapshot.config.id, snapshot.ratePeriods);
}
