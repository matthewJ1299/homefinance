/**
 * Integration tests: MortgageService records payments through Postgres and recalculates
 * principal/interest from the reduced balance after prior payments.
 * Requires DATABASE_URL and a seeded DB (npm run db:fresh). Restores mortgage state after each test.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { addMonths, format } from "date-fns";
import {
  allocateMonthPrincipalInterest,
  calculateMortgagePayment,
} from "@/lib/services/finance/mortgage";
import { MortgageService } from "@/lib/services/mortgage.service";
import type { MortgagePaymentRow } from "@/lib/repositories/interfaces/mortgage.repository";
import {
  restoreMortgageSnapshot,
  snapshotMortgage,
  wipeMortgageLedger,
  type MortgageDbSnapshot,
} from "./helpers/mortgage-db";

const HAS_DB = Boolean(process.env.DATABASE_URL);

const TEST_MORTGAGE = {
  propertyValue: 2_400_000_00,
  loanAmount: 1_800_000_00,
  annualInterestRate: 0.1025,
  loanTermMonths: 360,
  startDate: "2018-01-01",
  targetEquityUserAPct: 0.55,
};

function paymentDateForMonth(startDate: string, monthNumber: number): string {
  const [year, month] = startDate.slice(0, 10).split("-").map(Number);
  return format(addMonths(new Date(year, month - 1, 15), monthNumber - 1), "yyyy-MM-dd");
}

function balanceAtMonthStart(loanAmount: number, payments: MortgagePaymentRow[], monthNumber: number) {
  const principalPaid = payments
    .filter((payment) => payment.monthNumber < monthNumber)
    .reduce((sum, payment) => sum + payment.principalPortion, 0);
  return loanAmount - principalPaid;
}

function expectedInterestForMonth(
  loanAmount: number,
  monthlyRate: number,
  payments: MortgagePaymentRow[],
  monthNumber: number
) {
  const inMonth = payments.filter((payment) => payment.monthNumber === monthNumber);
  const totalAmount = inMonth.reduce((sum, payment) => sum + payment.amount, 0);
  const balanceAtStart = balanceAtMonthStart(loanAmount, payments, monthNumber);
  return Math.min(Math.round(balanceAtStart * monthlyRate), totalAmount);
}

describe.runIf(HAS_DB)("Mortgage interest recalc (integration)", () => {
  let backup: MortgageDbSnapshot | null = null;
  let service: MortgageService;
  let userIds: [number, number];
  let monthlyPayment: number;
  let monthlyRate: number;

  beforeAll(async () => {
    const { initDb } = await import("@/lib/db");
    await initDb();
    service = new MortgageService();
    backup = await snapshotMortgage();
    if (!backup) {
      throw new Error("No active mortgage config. Run npm run db:fresh before integration tests.");
    }
    if (backup.userConfigs.length < 2) {
      throw new Error("Mortgage seed needs two user configs.");
    }
    userIds = [backup.userConfigs[0]!.userId, backup.userConfigs[1]!.userId] as [number, number];
    monthlyRate = TEST_MORTGAGE.annualInterestRate / 12;
    monthlyPayment = calculateMortgagePayment({
      principal: TEST_MORTGAGE.loanAmount,
      rate: monthlyRate,
      months: TEST_MORTGAGE.loanTermMonths,
    });
  });

  beforeEach(async () => {
    if (!backup) return;
    await wipeMortgageLedger(backup.config.id);
    await service.saveConfig({
      ...TEST_MORTGAGE,
      users: backup.userConfigs.map((user) => ({
        userId: user.userId,
        initialDeposit: user.initialDeposit,
        baseSplitPct: user.baseSplitPct,
        monthlyCap: user.monthlyCap ?? undefined,
      })),
    });
  });

  afterEach(async () => {
    if (backup) {
      await restoreMortgageSnapshot(backup);
    }
  });

  it("recalculates each payment's interest from prior principal after 48 monthly payments", async () => {
    for (let month = 1; month <= 48; month++) {
      const userId = month % 2 === 1 ? userIds[0] : userIds[1];
      const ok = await service.recordPaymentFromExpense(
        userId,
        monthlyPayment,
        paymentDateForMonth(TEST_MORTGAGE.startDate, month)
      );
      expect(ok).toBe(true);
    }

    const { getMortgageRepository } = await import("@/lib/repositories");
    const payments = await getMortgageRepository().getPayments(backup!.config.id);
    expect(payments).toHaveLength(48);

    let previousMonthInterest = Number.POSITIVE_INFINITY;
    for (let month = 1; month <= 48; month++) {
      const inMonth = payments.filter((payment) => payment.monthNumber === month);
      const monthInterest = inMonth.reduce((sum, payment) => sum + payment.interestPortion, 0);

      expect(monthInterest).toBe(
        expectedInterestForMonth(TEST_MORTGAGE.loanAmount, monthlyRate, payments, month)
      );
      expect(monthInterest).toBeLessThanOrEqual(previousMonthInterest);

      for (const payment of inMonth) {
        expect(payment.principalPortion + payment.interestPortion).toBe(payment.amount);
        expect(payment.interestPortion).toBeGreaterThanOrEqual(0);
        expect(payment.principalPortion).toBeGreaterThanOrEqual(0);
      }

      previousMonthInterest = monthInterest;
    }

    expect(payments[47]!.interestPortion).toBeLessThan(payments[0]!.interestPortion);
  });

  it("keeps interest declining over 100 sequential DB round-trips", async () => {
    for (let month = 1; month <= 100; month++) {
      await service.recordPaymentFromExpense(
        userIds[month % 2]!,
        monthlyPayment,
        paymentDateForMonth(TEST_MORTGAGE.startDate, month)
      );
    }

    const { getMortgageRepository } = await import("@/lib/repositories");
    const payments = await getMortgageRepository().getPayments(backup!.config.id);
    expect(payments).toHaveLength(100);

    const firstMonthInterest = payments
      .filter((payment) => payment.monthNumber === 1)
      .reduce((sum, payment) => sum + payment.interestPortion, 0);
    const lastMonthInterest = payments
      .filter((payment) => payment.monthNumber === 100)
      .reduce((sum, payment) => sum + payment.interestPortion, 0);

    expect(lastMonthInterest).toBeLessThan(firstMonthInterest);

    const totalPrincipal = payments.reduce((sum, payment) => sum + payment.principalPortion, 0);
    const totalInterest = payments.reduce((sum, payment) => sum + payment.interestPortion, 0);
    expect(totalPrincipal + totalInterest).toBe(monthlyPayment * 100);
    expect(totalPrincipal).toBeGreaterThan(0);
  });

  it("matches schedule actual rows after getSchedule recalculates stored payments", async () => {
    for (let month = 1; month <= 36; month++) {
      await service.recordPaymentFromExpense(
        userIds[0]!,
        monthlyPayment,
        paymentDateForMonth(TEST_MORTGAGE.startDate, month)
      );
    }

    const schedule = await service.getSchedule();
    expect(schedule).not.toBeNull();

    const actualRows = schedule!.schedule.filter((row) => row.month <= 36);
    expect(actualRows).toHaveLength(36);

    for (const row of actualRows) {
      expect(row.interest).toBe(Math.round(row.openingBalance * monthlyRate));
      expect(row.principal + row.interest).toBe(row.totalPayment);
      expect(row.openingBalance - row.principal).toBe(row.closingBalance);
    }

    expect(actualRows[35]!.interest).toBeLessThan(actualRows[0]!.interest);
  });

  it("splits two same-month payments using one opening balance for interest", async () => {
    const month = 12;
    const splitA = Math.round(monthlyPayment * 0.58);
    const splitB = monthlyPayment - splitA;

    for (let priorMonth = 1; priorMonth < month; priorMonth++) {
      await service.recordPaymentFromExpense(
        userIds[priorMonth % 2]!,
        monthlyPayment,
        paymentDateForMonth(TEST_MORTGAGE.startDate, priorMonth)
      );
    }

    await service.recordPaymentFromExpense(
      userIds[0]!,
      splitA,
      paymentDateForMonth(TEST_MORTGAGE.startDate, month)
    );
    await service.recordPaymentFromExpense(
      userIds[1]!,
      splitB,
      paymentDateForMonth(TEST_MORTGAGE.startDate, month)
    );

    const { getMortgageRepository } = await import("@/lib/repositories");
    const payments = await getMortgageRepository().getPayments(backup!.config.id);
    const monthPayments = payments
      .filter((payment) => payment.monthNumber === month)
      .sort((a, b) => a.id - b.id);
    expect(monthPayments).toHaveLength(2);

    const balanceAtStart = balanceAtMonthStart(TEST_MORTGAGE.loanAmount, payments, month);
    const expectedAllocations = allocateMonthPrincipalInterest({
      balanceAtMonthStart: balanceAtStart,
      monthlyRate,
      paymentsInMonth: monthPayments.map((payment) => ({ amount: payment.amount })),
    });

    const actualInterest = monthPayments.reduce((sum, payment) => sum + payment.interestPortion, 0);
    const expectedInterest = expectedAllocations.reduce((sum, row) => sum + row.interestPortion, 0);
    expect(actualInterest).toBe(expectedInterest);
    expect(actualInterest).toBe(Math.round(balanceAtStart * monthlyRate));

    for (let i = 0; i < monthPayments.length; i++) {
      const payment = monthPayments[i]!;
      const allocation = expectedAllocations[i]!;
      expect(payment.principalPortion).toBe(allocation.principalPortion);
      expect(payment.interestPortion).toBe(allocation.interestPortion);
    }
  });

  it("recalculates upcoming payment when a new rate period starts", async () => {
    for (let month = 1; month <= 5; month++) {
      await service.recordPaymentFromExpense(
        userIds[month % 2]!,
        monthlyPayment,
        paymentDateForMonth(TEST_MORTGAGE.startDate, month)
      );
    }

    await service.saveRatePeriods([{ effectiveFromMonth: 6, annualInterestRate: 0.115 }]);

    const scheduleBeforeMonth6 = await service.getSchedule();
    expect(scheduleBeforeMonth6).not.toBeNull();
    const paymentAtMonth5 = scheduleBeforeMonth6!.schedule.find((row) => row.month === 5)!;
    const paymentAtMonth6 = scheduleBeforeMonth6!.schedule.find((row) => row.month === 6)!;

    expect(paymentAtMonth6.totalPayment).toBeGreaterThan(paymentAtMonth5.totalPayment);
    expect(scheduleBeforeMonth6!.upcomingAnnualRate).toBe(0.115);
    expect(scheduleBeforeMonth6!.upcomingMonthNumber).toBe(6);
    expect(paymentAtMonth6.interest).toBe(
      Math.round(paymentAtMonth6.openingBalance * (0.115 / 12))
    );
  });
});
