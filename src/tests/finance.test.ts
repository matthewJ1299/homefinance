import { describe, it, expect } from "vitest";
import {
  applyTransaction,
  calculateNetWorth,
  splitExpense,
  splitExpenseWithRatios,
  calculateSplitBalance,
} from "@/lib/services/finance/accounts";
import {
  updateGoal,
  calculateMonthsToGoal,
  projectGoalOverTime,
} from "@/lib/services/finance/goals";
import {
  applyCreditPayment,
  applyInterest,
  simulateCreditPayoff,
} from "@/lib/services/finance/credit";
import {
  calculateMortgagePayment,
  calculateAmortizationStep,
  simulateMortgage,
  splitMortgageContributions,
} from "@/lib/services/finance/mortgage";
import {
  projectSavingsGoalCompletionMonth,
  estimateCreditPayoffTimeline,
} from "@/lib/services/finance/projections";

describe("Expenses & Transactions", () => {
  it("adds an expense and reduces account balance", () => {
    const result = applyTransaction({
      balance: 1000,
      transaction: { amount: -200 },
    });

    expect(result.balance).toBe(800);
  });

  it("handles multiple expenses correctly", () => {
    let balance = 1000;
    balance = applyTransaction({ balance, transaction: { amount: -100 } }).balance;
    balance = applyTransaction({ balance, transaction: { amount: -50 } }).balance;
    balance = applyTransaction({ balance, transaction: { amount: 25 } }).balance;
    expect(balance).toBe(875);
  });

  it("handles negative balances", () => {
    const result = applyTransaction({
      balance: -100,
      transaction: { amount: 50 },
    });

    expect(result.balance).toBe(-50);
  });
});

describe("Net Worth", () => {
  it("calculates correctly across accounts", () => {
    const netWorth = calculateNetWorth([
      { type: "bank", balance: 5000 },
      { type: "savings", balance: 10000 },
      { type: "credit", balance: -2000 },
    ]);

    expect(netWorth).toBe(13000);
  });

  it("is 0 when all account balances are 0", () => {
    const netWorth = calculateNetWorth([
      { type: "bank", balance: 0 },
      { type: "savings", balance: 0 },
      { type: "credit", balance: 0 },
    ]);
    expect(netWorth).toBe(0);
  });

  it("includes credit negative balances", () => {
    const netWorth = calculateNetWorth([{ type: "credit", balance: -500 }]);
    expect(netWorth).toBe(-500);
  });
});

describe("Split Costs", () => {
  it("splits cost equally between two users", () => {
    const result = splitExpense({ amount: 100, users: ["A", "B"] });
    expect(result).toEqual({ A: 50, B: 50 });
  });

  it("splits cost equally between multiple users", () => {
    const result = splitExpense({ amount: 100, users: ["A", "B", "C", "D"] });
    expect(result).toEqual({ A: 25, B: 25, C: 25, D: 25 });
  });

  it("handles unequal split using explicit per-user amounts", () => {
    const result = splitExpenseWithRatios({ amount: 100, splits: { A: 70, B: 30 } });
    expect(result.A).toBe(70);
    expect(result.B).toBe(30);
  });

  it("computes owed balance for one payer with multiple beneficiaries", () => {
    const result = calculateSplitBalance({
      currentUserId: 1,
      allocations: [
        { paidByUserId: 1, paidByUserName: "A", allocationUserId: 2, allocationUserName: "B", amount: 30 },
        { paidByUserId: 1, paidByUserName: "A", allocationUserId: 3, allocationUserName: "C", amount: 20 },
      ],
      settlements: [],
    });

    expect(result.owedToMe).toBe(50);
    expect(result.iOwe).toBe(0);
    expect(result.net).toBe(50);
  });

  it("reduces owed balance after partial settlement", () => {
    const result = calculateSplitBalance({
      currentUserId: 1,
      allocations: [
        { paidByUserId: 1, paidByUserName: "A", allocationUserId: 2, allocationUserName: "B", amount: 50 },
      ],
      settlements: [{ payerUserId: 2, payerUserName: "B", recipientUserId: 1, recipientUserName: "A", amount: 20 }],
    });

    expect(result.owedToMe).toBe(30);
    expect(result.iOwe).toBe(0);
    expect(result.net).toBe(30);
  });
});

describe("Mortgage Engine", () => {
  it("calculates monthly mortgage payment (annuity formula)", () => {
    const payment = calculateMortgagePayment({
      principal: 1_000_000,
      rate: 0.1 / 12,
      months: 240,
    });

    // Matches known annuity results for the same formula.
    const r = 0.1 / 12;
    const n = 240;
    const expected = (1_000_000 * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    expect(payment).toBeCloseTo(Math.round(expected), -2);
  });

  it("splits payment correctly into interest and principal", () => {
    const result = calculateAmortizationStep({
      balance: 100_000,
      rate: 0.01,
      payment: 2000,
    });

    expect(result.interest).toBe(1000);
    expect(result.principal).toBe(1000);
    expect(result.closingBalance).toBe(99_000);
  });

  it("reduces term when extra payment is made", () => {
    const standard = simulateMortgage({
      loanAmount: 100_000,
      rate: 0.01,
      termMonths: 120,
      extraPayment: 0,
    });

    const withExtra = simulateMortgage({
      loanAmount: 100_000,
      rate: 0.01,
      termMonths: 120,
      extraPayment: 500,
      extraPaymentEveryMonth: true,
    });

    expect(withExtra.months).toBeLessThan(standard.months);
    expect(withExtra.totalInterest).toBeLessThan(standard.totalInterest);
  });

  it("recalculates payment when rate changes", () => {
    const oldPayment = calculateMortgagePayment({ principal: 100_000, rate: 0.08 / 12, months: 240 });
    const newPayment = calculateMortgagePayment({ principal: 100_000, rate: 0.1 / 12, months: 240 });
    expect(newPayment).toBeGreaterThan(oldPayment);
  });

  it("splits mortgage contributions between users", () => {
    const result = splitMortgageContributions({ payment: 10_000, split: { A: 70, B: 30 } });
    expect(result.A).toBe(7000);
    expect(result.B).toBe(3000);
  });
});

describe("Credit System", () => {
  it("reduces credit balance on payment", () => {
    const balance = applyCreditPayment({ balance: -5000, payment: 2000 });
    expect(balance).toBe(-3000);
  });

  it("adds interest to credit", () => {
    const balance = applyInterest({ balance: -5000, interest: 200 });
    expect(balance).toBe(-5200);
  });

  it("handles overpayment (balance crosses to positive)", () => {
    const balance = applyCreditPayment({ balance: -1000, payment: 1500 });
    expect(balance).toBe(500);
  });

  it("calculates payoff duration", () => {
    const result = simulateCreditPayoff({ balance: 5000, payment: 1000, rate: 0.02 });
    expect(result.months).not.toBeNull();
    expect(result.months).toBeGreaterThan(0);
    expect(result.totalInterest).toBeGreaterThan(0);
  });
});

describe("Savings Goals", () => {
  it("adds to savings goal", () => {
    const current = 1000;
    const progress = updateGoal({ current, contribution: 500 });
    expect(progress).toBe(1500);
  });

  it("reduces goal on withdrawal", () => {
    const current = 2000;
    const progress = updateGoal({ current, contribution: -500 });
    expect(progress).toBe(1500);
  });

  it("calculates months to reach goal", () => {
    const months = calculateMonthsToGoal({ remaining: 10_000, monthly: 2000 });
    expect(months).toBe(5);
  });

  it("returns null when monthly target is not positive", () => {
    const months = calculateMonthsToGoal({ remaining: 10_000, monthly: 0 });
    expect(months).toBeNull();
  });

  it("projects savings over time", () => {
    const projected = projectGoalOverTime({
      startingBalance: 0,
      monthlyContribution: 2000,
      rate: 0.01,
      months: 6,
    });
    expect(projected).toBeGreaterThan(12_000);
  });
});

describe("Time-Based Projections", () => {
  it("calculates projected completion month for savings goals", () => {
    const projected = projectSavingsGoalCompletionMonth({
      month: "2024-03",
      remaining: 10_000,
      monthlyTarget: 2000,
    });
    expect(projected).toBe("2024-08");
  });

  it("credit payoff duration increases when monthly payment decreases", () => {
    const debt = 5000;
    const apr = 0.02;
    const monthsHighPayment = estimateCreditPayoffTimeline({ debt, apr, monthlyPayment: 2000 }).months;
    const monthsLowPayment = estimateCreditPayoffTimeline({ debt, apr, monthlyPayment: 1000 }).months;
    expect(monthsHighPayment).not.toBeNull();
    expect(monthsLowPayment).not.toBeNull();
    expect(monthsHighPayment as number).toBeLessThanOrEqual(monthsLowPayment as number);
  });
});

describe("Golden Tests (Life Simulation)", () => {
  it("full life simulation (income, expenses, savings, credit)", () => {
    const income = 25_000;
    const expenses = 15_000;
    const startingSavings = 5_000;
    let savings = startingSavings;
    let creditBalance = -50_000; // signed debt balance for a credit account
    const creditPayment = 3_000;
    const months = 12;

    for (let i = 0; i < months; i++) {
      const netCash = income - expenses; // assumed cash available each month
      creditBalance = applyCreditPayment({ balance: creditBalance, payment: creditPayment });
      const leftoverToSavings = netCash - creditPayment;
      savings += Math.max(0, leftoverToSavings);
    }

    expect(savings).toBeGreaterThan(60_000);
    expect(creditBalance).toBeLessThan(0);
    const netWorth = savings + creditBalance;
    expect(netWorth).toBeGreaterThan(0);
  });
});

