import { describe, it, expect } from "vitest";
import {
  applyTransaction,
  calculateSplitBalance,
  splitExpense,
  splitExpenseWithRatios,
  calculateBudgetOverviewArithmetic,
} from "@/lib/services/finance/accounts";
import {
  calculateAmortizationStep,
  calculateMortgagePayment,
  simulateMortgage,
  splitMortgageContributions,
  allocateMonthPrincipalInterest,
} from "@/lib/services/finance/mortgage";
import {
  standardMonthlyPayment,
  simulateSchedule,
  projectScheduleFromBalance,
} from "@/lib/services/mortgage-calculator";
import type { MortgageParams } from "@/lib/types/mortgage.types";

/** A is the primary (largest base split), B the other. Ids, not positions. */
const A = 1;
const B = 2;
import { estimateCreditPayoff } from "@/lib/services/finance/credit";
import { toMinorUnits, fromMinorUnits } from "@/lib/utils/currency";

const mortgageParams: MortgageParams = {
  loanAmount: 2_450_000_00,
  monthlyRate: 0.1125 / 12,
  termMonths: 360,
  propertyValue: 3_000_000_00,
  people: [
    { userId: A, deposit: 300_000_00, baseSplitPct: 0.55, monthlyCap: null },
    { userId: B, deposit: 250_000_00, baseSplitPct: 0.45, monthlyCap: null },
  ],
};

function expectInterestFromOpeningBalance(
  openingBalance: number,
  monthlyRate: number,
  interest: number
) {
  expect(interest).toBe(Math.round(openingBalance * monthlyRate));
}

describe("transaction drift — mortgage (high volume)", () => {
  it("240-month schedule keeps balance chain and row invariants", () => {
    const M = standardMonthlyPayment(
      mortgageParams.loanAmount,
      mortgageParams.monthlyRate,
      mortgageParams.termMonths
    );
    const userBBase = Math.round(mortgageParams.people[1].baseSplitPct * M);
    const { schedule } = simulateSchedule(
      mortgageParams,
      M,
      { [B]: userBBase },
      0,
      "2024-01"
    );

    expect(schedule.length).toBeGreaterThan(200);

    let totalPrincipal = 0;
    let totalInterest = 0;
    for (let i = 0; i < schedule.length; i++) {
      const row = schedule[i]!;
      expectInterestFromOpeningBalance(row.openingBalance, mortgageParams.monthlyRate, row.interest);
      expect(row.principal + row.interest).toBe(row.totalPayment);
      expect(row.paymentByUserId[A] + row.paymentByUserId[B]).toBe(row.totalPayment);
      expect(row.openingBalance - row.principal).toBe(row.closingBalance);
      if (i > 0) {
        expect(row.openingBalance).toBe(schedule[i - 1]!.closingBalance);
        expect(row.interest).toBeLessThanOrEqual(schedule[i - 1]!.interest);
      }
      totalPrincipal += row.principal;
      totalInterest += row.interest;
    }

    expect(schedule[schedule.length - 1]!.closingBalance).toBe(0);
    expect(totalPrincipal).toBe(mortgageParams.loanAmount);
    expect(totalInterest).toBeGreaterThan(0);
    expect(schedule[0]!.interest).toBeGreaterThan(schedule[119]!.interest);
  });

  it("360-month generateSchedule with monthly extras does not break invariants", () => {
    const params: MortgageParams = {
      ...mortgageParams,
      termMonths: 360,
    };
    const M = standardMonthlyPayment(params.loanAmount, params.monthlyRate, params.termMonths);
    const userBBase = Math.min(Math.round(params.people[1].baseSplitPct * M), M);
    const extraByMonth = (month: number) => (month % 6 === 0 ? 500_00 : month % 11 === 0 ? 250_00 : 0);

    const { schedule } = simulateSchedule(params, M, { [B]: userBBase }, 0, "2020-06", extraByMonth);

    let totalPrincipal = 0;
    for (let i = 0; i < schedule.length; i++) {
      const row = schedule[i]!;
      expectInterestFromOpeningBalance(row.openingBalance, params.monthlyRate, row.interest);
      expect(row.principal + row.interest).toBe(row.totalPayment);
      expect(row.openingBalance - row.principal).toBe(row.closingBalance);
      if (i > 0) {
        expect(row.openingBalance).toBe(schedule[i - 1]!.closingBalance);
      }
      totalPrincipal += row.principal;
    }

    expect(schedule[schedule.length - 1]!.closingBalance).toBe(0);
    expect(totalPrincipal).toBe(params.loanAmount);
    expect(schedule.length).toBeLessThan(360);
  });

  it("interest after 180 payments uses reduced balance, not original loan", () => {
    const params: MortgageParams = {
      loanAmount: 3_200_000_00,
      monthlyRate: 0.1025 / 12,
      termMonths: 360,
      propertyValue: 3_800_000_00,
      people: [
        { userId: A, deposit: 400_000_00, baseSplitPct: 0.6, monthlyCap: null },
        { userId: B, deposit: 200_000_00, baseSplitPct: 0.4, monthlyCap: null },
      ],
    };
    const M = standardMonthlyPayment(params.loanAmount, params.monthlyRate, params.termMonths);
    const userBBase = Math.round(params.people[1].baseSplitPct * M);
    const { schedule } = simulateSchedule(params, M, { [B]: userBBase }, 0, "2018-03");

    const after180 = schedule[179]!;
    const month181 = schedule[180]!;

    expectInterestFromOpeningBalance(
      after180.closingBalance,
      params.monthlyRate,
      month181.interest
    );
    expect(month181.interest).toBeLessThan(
      Math.round(params.loanAmount * params.monthlyRate)
    );
    expect(month181.interest).toBeLessThan(schedule[0]!.interest);
  });

  it("projectScheduleFromBalance recalculates interest from mid-loan balance", () => {
    const M = standardMonthlyPayment(
      mortgageParams.loanAmount,
      mortgageParams.monthlyRate,
      mortgageParams.termMonths
    );
    const userBBase = Math.round(mortgageParams.people[1].baseSplitPct * M);
    const full = simulateSchedule(mortgageParams, M, { [B]: userBBase }, 0, "2022-01");
    const pivot = 96;
    const pivotRow = full.schedule[pivot - 1]!;

    const projected = projectScheduleFromBalance({
      params: mortgageParams,
      startBalance: pivotRow.closingBalance,
      startMonth: pivot + 1,
      startDate: "2022-01",
      M,
      bases: { [B]: userBBase },
      topUp: 0,
      initialTotals: {
        [A]: pivotRow.paymentByUserId[A],
        [B]: pivotRow.paymentByUserId[B],
      },
    });

    for (let i = 0; i < projected.schedule.length; i++) {
      const projectedRow = projected.schedule[i]!;
      const fullRow = full.schedule[pivot + i]!;
      expectInterestFromOpeningBalance(
        projectedRow.openingBalance,
        mortgageParams.monthlyRate,
        projectedRow.interest
      );
      expect(projectedRow.interest).toBe(fullRow.interest);
      expect(projectedRow.principal).toBe(fullRow.principal);
      expect(projectedRow.closingBalance).toBe(fullRow.closingBalance);
    }
  });

  it("recorded payments recalculate interest each month after prior principal is applied", () => {
    const loanAmount = 2_100_000_00;
    const monthlyRate = 0.115 / 12;
    const termMonths = 360;
    const payment = calculateMortgagePayment({ principal: loanAmount, rate: monthlyRate, months: termMonths });

    type RecordedPayment = {
      monthNumber: number;
      amount: number;
      principalPortion: number;
      interestPortion: number;
    };

    const recorded: RecordedPayment[] = [];
    let balance = loanAmount;
    let priorMonthInterest = Number.POSITIVE_INFINITY;

    for (let monthNumber = 1; monthNumber <= 240; monthNumber++) {
      recorded.push({ monthNumber, amount: payment, principalPortion: 0, interestPortion: 0 });

      const principalPaidBefore = recorded
        .filter((p) => p.monthNumber < monthNumber)
        .reduce((sum, p) => sum + p.principalPortion, 0);
      const balanceAtStart = loanAmount - principalPaidBefore;

      const allocations = allocateMonthPrincipalInterest({
        balanceAtMonthStart: balanceAtStart,
        monthlyRate,
        paymentsInMonth: recorded.filter((p) => p.monthNumber === monthNumber),
      });

      const monthPayment = recorded.find((p) => p.monthNumber === monthNumber)!;
      const allocation = allocations[0]!;
      monthPayment.principalPortion = allocation.principalPortion;
      monthPayment.interestPortion = allocation.interestPortion;

      expectInterestFromOpeningBalance(balanceAtStart, monthlyRate, monthPayment.interestPortion);
      expect(monthPayment.principalPortion + monthPayment.interestPortion).toBe(payment);
      expect(monthPayment.interestPortion).toBeLessThanOrEqual(priorMonthInterest);

      balance = balanceAtStart - monthPayment.principalPortion;
      priorMonthInterest = monthPayment.interestPortion;
    }

    const principalPaid = loanAmount - balance;
    expect(principalPaid).toBeGreaterThan(loanAmount * 0.15);
    expect(recorded[239]!.interestPortion).toBeLessThan(recorded[0]!.interestPortion);
  });

  it("split payments in one month share recalculated interest from opening balance", () => {
    const loanAmount = 1_500_000_00;
    const monthlyRate = 0.09 / 12;
    const payment = calculateMortgagePayment({ principal: loanAmount, rate: monthlyRate, months: 240 });

    let balance = loanAmount;
    for (let month = 1; month <= 120; month++) {
      const splitA = Math.round(payment * 0.62);
      const splitB = payment - splitA;
      const allocations = allocateMonthPrincipalInterest({
        balanceAtMonthStart: balance,
        monthlyRate,
        paymentsInMonth: [{ amount: splitA }, { amount: splitB }],
      });

      const monthInterest = allocations.reduce((sum, row) => sum + row.interestPortion, 0);
      const monthPrincipal = allocations.reduce((sum, row) => sum + row.principalPortion, 0);

      expectInterestFromOpeningBalance(balance, monthlyRate, monthInterest);
      expect(monthPrincipal + monthInterest).toBe(payment);
      for (const row of allocations) {
        expect(row.principalPortion + row.interestPortion).toBeGreaterThan(0);
      }

      balance -= monthPrincipal;
    }

    expect(balance).toBeLessThan(loanAmount);
    expect(balance).toBeGreaterThan(0);
  });

  it("calculateAmortizationStep chain over 360 months matches simulateMortgage payoff", () => {
    const loanAmount = 1_800_000_00;
    const rate = 0.09 / 12;
    const termMonths = 360;
    const payment = calculateMortgagePayment({ principal: loanAmount, rate, months: termMonths });

    let balance = loanAmount;
    let months = 0;
    let totalInterest = 0;
    let previousInterest = Number.POSITIVE_INFINITY;
    const maxMonths = termMonths * 2;

    while (balance > 0 && months < maxMonths) {
      months += 1;
      const step = calculateAmortizationStep({ balance, rate, payment });
      expect(step.interest).toBe(Math.round(balance * rate));
      expect(step.interest).toBeLessThanOrEqual(previousInterest);
      totalInterest += step.interest;
      balance = step.closingBalance;
      previousInterest = step.interest;
      expect(step.interest).toBeGreaterThanOrEqual(0);
      expect(step.principal).toBeGreaterThanOrEqual(0);
      expect(step.totalPayment).toBeLessThanOrEqual(payment);
    }

    const sim = simulateMortgage({ loanAmount, rate, termMonths, maxMonths });
    expect(balance).toBe(sim.finalBalance);
    expect(months).toBe(sim.months);
    expect(totalInterest).toBe(sim.totalInterest);
  });

  it("splitMortgageContributions over many payments stays within 1 cent per user of payment", () => {
    for (let paymentCents = 10_000; paymentCents <= 10_000_00; paymentCents += 7_31) {
      const shares = splitMortgageContributions({
        payment: paymentCents,
        split: { A: 55, B: 45 },
      });
      const sum = shares.A + shares.B;
      expect(Math.abs(sum - paymentCents)).toBeLessThanOrEqual(1);
    }
  });
});

describe("transaction drift — splits (high volume)", () => {
  it("splitExpense preserves total for every amount 1..5000 cents", () => {
    const users = ["payer", "other"];
    for (let amount = 1; amount <= 5000; amount++) {
      const shares = splitExpense({ amount, users });
      expect(shares.payer + shares.other).toBe(amount);
    }
  });

  it("splitExpenseWithRatios preserves total across many weight combinations", () => {
    for (let amount = 1; amount <= 2000; amount += 3) {
      for (let wA = 1; wA <= 9; wA++) {
        const shares = splitExpenseWithRatios({
          amount,
          splits: { A: wA, B: 10 - wA },
        });
        expect(shares.A + shares.B).toBe(amount);
      }
    }
  });

  it("500 alternating split expenses + partial settlements stay consistent for both users", () => {
    type Row = Parameters<typeof calculateSplitBalance>[0]["allocations"][0];
    type Settle = Parameters<typeof calculateSplitBalance>[0]["settlements"][0];

    const allocations: Row[] = [];
    const settlements: Settle[] = [];

    for (let i = 0; i < 500; i++) {
      const totalCents = 199 + ((i * 37) % 500);
      const shares = splitExpense({ amount: totalCents, users: ["payer", "other"] });
      const payerId = i % 2 === 0 ? 1 : 2;
      const otherId = payerId === 1 ? 2 : 1;
      allocations.push({
        paidByUserId: payerId,
        paidByUserName: payerId === 1 ? "Alice" : "Bob",
        allocationUserId: otherId,
        allocationUserName: otherId === 1 ? "Alice" : "Bob",
        amount: shares.other,
      });

      if (i % 7 === 6) {
        const balanceForPayer = calculateSplitBalance({
          currentUserId: payerId,
          allocations,
          settlements,
        });
        const other = balanceForPayer.perUser.find((u) => u.userId === otherId);
        const owedToPayer = other?.owedToMe ?? 0;
        if (owedToPayer > 0) {
          const settleAmount = Math.min(owedToPayer, Math.floor(owedToPayer / 2) || owedToPayer);
          settlements.push({
            payerUserId: otherId,
            payerUserName: otherId === 1 ? "Alice" : "Bob",
            recipientUserId: payerId,
            recipientUserName: payerId === 1 ? "Alice" : "Bob",
            amount: settleAmount,
          });
        }
      }
    }

    for (const viewerId of [1, 2] as const) {
      const balance = calculateSplitBalance({
        currentUserId: viewerId,
        allocations,
        settlements,
      });
      expect(balance.net).toBe(balance.owedToMe - balance.iOwe);
      for (const u of balance.perUser) {
        expect(u.owedToMe).toBeGreaterThanOrEqual(0);
        expect(u.iOwe).toBeGreaterThanOrEqual(0);
        expect(u.owedToMe - u.iOwe).toBeLessThanOrEqual(balance.net);
        expect(u.iOwe - u.owedToMe).toBeLessThanOrEqual(-balance.net);
      }
    }
  });

  it("recomputing balance after each of 200 sequential expenses matches batch result", () => {
    type Row = Parameters<typeof calculateSplitBalance>[0]["allocations"][0];
    const allocations: Row[] = [];
    let runningNetUser1 = 0;

    for (let i = 0; i < 200; i++) {
      const amount = 50 + (i % 13);
      const shares = splitExpense({ amount, users: ["me", "them"] });
      allocations.push({
        paidByUserId: 1,
        paidByUserName: "Alice",
        allocationUserId: 2,
        allocationUserName: "Bob",
        amount: shares.them,
      });
      runningNetUser1 += shares.them;

      const incremental = calculateSplitBalance({
        currentUserId: 1,
        allocations,
        settlements: [],
      });
      expect(incremental.net).toBe(runningNetUser1);
    }

    const batch = calculateSplitBalance({
      currentUserId: 1,
      allocations,
      settlements: [],
    });
    expect(batch.net).toBe(runningNetUser1);
  });
});

describe("transaction drift — ledger and credit (high volume)", () => {
  it("10_000 ledger postings equal sum of amounts", () => {
    let balance = 1_000_000_00;
    let expected = balance;

    for (let i = 0; i < 10_000; i++) {
      const amount = ((i * 17) % 5000) - 2500;
      expected += amount;
      balance = applyTransaction({ balance, transaction: { amount } }).balance;
    }

    expect(balance).toBe(expected);
  });

  it("credit payoff over 120 months accumulates interest without negative remaining", () => {
    const debt = 85_000_00;
    const apr = 0.2249;
    const monthlyPayment = 2_100_00;
    const result = estimateCreditPayoff({ debt, apr, monthlyPayment });

    expect(result.months).not.toBeNull();
    expect(result.months!).toBeGreaterThan(0);
    expect(result.months!).toBeLessThan(120);
    expect(result.totalInterest).toBeGreaterThan(0);

    let remaining = debt;
    let totalInterest = 0;
    const monthlyRate = apr / 12;
    for (let m = 0; m < result.months!; m++) {
      const interest = Math.round(remaining * monthlyRate);
      totalInterest += interest;
      remaining = remaining + interest - monthlyPayment;
      expect(remaining).toBeGreaterThanOrEqual(-monthlyPayment);
    }
    expect(totalInterest).toBe(result.totalInterest);
  });

  it("currency round-trip over 1000 rand values stays stable", () => {
    for (let cents = 1; cents <= 100_000; cents += 97) {
      const rands = cents / 100;
      const roundTripped = fromMinorUnits(toMinorUnits(rands));
      expect(toMinorUnits(roundTripped)).toBe(toMinorUnits(rands));
    }
  });
});

describe("transaction drift — budget arithmetic (many categories)", () => {
  it("100 category rows preserve balance = income - expenses", () => {
    const categories = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      name: `Category ${i + 1}`,
      groupName: "Living",
      costType: "variable" as const,
    }));
    const allocationMap = new Map<number, number>();
    const spentByCategory: Record<number, number> = {};
    let totalExpenses = 0;
    let totalAllocated = 0;

    for (let i = 0; i < 100; i++) {
      const id = i + 1;
      const allocated = (i + 1) * 100_00;
      const spent = (i + 1) * 80_00 + (i % 5) * 10_00;
      allocationMap.set(id, allocated);
      spentByCategory[id] = spent;
      totalAllocated += allocated;
      totalExpenses += spent;
    }

    const income = 500_000_00;
    const overview = calculateBudgetOverviewArithmetic({
      totalIncome: income,
      totalExpenses,
      categories,
      allocationMap,
      carriedInMap: new Map(),
      expenses: [],
      spentByCategory,
    });

    expect(overview.balance).toBe(income - totalExpenses);
    expect(overview.totalAllocated).toBe(totalAllocated);
    expect(overview.unallocated).toBe(income - totalAllocated);
    expect(overview.categoryRows).toHaveLength(100);
    expect(
      overview.categoryRows.reduce((s, r) => s + r.remaining, 0)
    ).toBe(totalAllocated - totalExpenses);
  });
});
