import type { Goal, GoalStrategy } from "@/lib/types";

export interface CreditPayoffEstimate {
  months: number | null;
  totalInterest: number;
  monthlyPayment: number;
  debt: number;
}

export function estimateCreditPayoff(input: {
  debt: number;
  apr: number | null;
  monthlyPayment: number;
}): CreditPayoffEstimate {
  const debt = Math.max(0, Math.round(input.debt));
  const monthlyPayment = Math.max(0, Math.round(input.monthlyPayment));
  const apr = input.apr ?? 0;
  const monthlyRate = apr <= 0 ? 0 : apr / 12;

  if (debt === 0) {
    return { months: 0, totalInterest: 0, monthlyPayment, debt: 0 };
  }
  if (monthlyPayment <= 0) {
    return { months: null, totalInterest: 0, monthlyPayment, debt };
  }

  let remaining = debt;
  let totalInterest = 0;
  let months = 0;

  // Hard cap to avoid infinite loops when payment is too low vs interest.
  const MAX_MONTHS = 1200;
  while (remaining > 0 && months < MAX_MONTHS) {
    const interest = monthlyRate > 0 ? Math.round(remaining * monthlyRate) : 0;
    totalInterest += interest;
    remaining = remaining + interest - monthlyPayment;
    months += 1;

    // Payment can't even cover interest: it will never converge.
    if (monthlyRate > 0 && months >= 3) {
      const interestOnly = Math.round((remaining + monthlyPayment) * monthlyRate);
      if (monthlyPayment <= interestOnly) return { months: null, totalInterest, monthlyPayment, debt };
    }
  }

  if (months >= MAX_MONTHS) {
    return { months: null, totalInterest, monthlyPayment, debt };
  }

  return { months, totalInterest, monthlyPayment, debt };
}

export interface StrategyComparison {
  strategy: GoalStrategy;
  months: number | null;
  totalInterest: number;
}

export interface StrategyRecommendation {
  best: GoalStrategy;
  comparisons: StrategyComparison[];
}

/**
 * KISS version: for now we recommend by lowest projected interest
 * using each credit goal's own monthlyTarget as its payment.
 * Multi-debt allocation (true avalanche/snowball) can be layered later.
 */
export function recommendCreditStrategy(goal: Goal, debt: number): StrategyRecommendation {
  const strategies: GoalStrategy[] = ["avalanche", "snowball", "target_date"];
  const comparisons: StrategyComparison[] = strategies.map((strategy) => {
    const est = estimateCreditPayoff({
      debt,
      apr: goal.apr,
      monthlyPayment: goal.monthlyTarget,
    });
    return { strategy, months: est.months, totalInterest: est.totalInterest };
  });

  const best =
    comparisons
      .slice()
      .sort((a, b) => {
        if (a.months == null && b.months != null) return 1;
        if (a.months != null && b.months == null) return -1;
        if (a.totalInterest !== b.totalInterest) return a.totalInterest - b.totalInterest;
        return (a.months ?? Number.MAX_SAFE_INTEGER) - (b.months ?? Number.MAX_SAFE_INTEGER);
      })[0]?.strategy ?? "avalanche";

  return { best, comparisons };
}

