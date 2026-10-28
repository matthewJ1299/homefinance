/**
 * Retained pure helpers, currently exercised only by the test suite.
 *
 * Their callers went with the pre-0043 goals model (savings/credit goals as
 * their own tables). The maths is correct and covered, and a debt-payoff view
 * would need it again, so it stays rather than being rewritten from scratch --
 * but nothing in the running app imports it today.
 */
import type { Goal, GoalStrategy } from "@/lib/types";

export interface CreditPayoffEstimate {
  months: number | null;
  totalInterest: number;
  monthlyPayment: number;
  debt: number;
}

export function applyCreditPayment(input: { balance: number; payment: number }): number {
  // Credit balances are signed: debt is negative. A positive payment reduces debt (towards 0 / positive).
  return input.balance + input.payment;
}

export function applyInterest(input: { balance: number; interest: number }): number {
  // Interest increases debt for credit accounts (more negative balance).
  return input.balance - input.interest;
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
 * KISS version: for now we recommend by lowest projected interest.
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

export function simulateCreditPayoff(input: {
  balance: number;
  payment: number;
  rate: number;
}): CreditPayoffEstimate {
  // In the app, credit debt is derived as: debt = max(0, -balance).
  // For this helper we accept a "balance" that represents debt magnitude.
  const debt = input.balance >= 0 ? input.balance : Math.max(0, -input.balance);
  return estimateCreditPayoff({ debt, apr: input.rate, monthlyPayment: input.payment });
}

/**
 * Calendar months from startMonth (yyyy-MM) through targetMonth (yyyy-MM), inclusive.
 * Example: 2025-03 .. 2026-11 => 21.
 */
export function inclusiveCalendarMonthsFromStartToTarget(startMonth: string, targetMonth: string): number {
  const [sy, sm] = startMonth.split("-").map(Number);
  const [ty, tm] = targetMonth.split("-").map(Number);
  if (!Number.isFinite(sy) || !Number.isFinite(sm) || !Number.isFinite(ty) || !Number.isFinite(tm)) {
    return 1;
  }
  const diff = (ty - sy) * 12 + (tm - sm);
  return Math.max(1, diff + 1);
}

/**
 * Smallest integer monthly payment (minor units) that pays off within maxMonths, or null if impossible.
 */
export function minimumMonthlyPaymentForMaxMonths(input: {
  debt: number;
  apr: number | null;
  maxMonths: number;
}): number | null {
  const debt = Math.max(0, Math.round(input.debt));
  const maxMonths = Math.max(1, Math.floor(input.maxMonths));
  if (debt === 0) return 0;

  let hi = Math.max(debt, 1);
  while (hi < debt * 200) {
    const est = estimateCreditPayoff({ debt, apr: input.apr, monthlyPayment: hi });
    if (est.months != null && est.months <= maxMonths) break;
    hi *= 2;
  }
  const top = estimateCreditPayoff({ debt, apr: input.apr, monthlyPayment: hi });
  if (top.months == null || top.months > maxMonths) return null;

  let lo = 1;
  let best = hi;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const est = estimateCreditPayoff({ debt, apr: input.apr, monthlyPayment: mid });
    if (est.months != null && est.months <= maxMonths) {
      best = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return best;
}

export interface CreditStrategyScenario {
  strategy: GoalStrategy;
  monthlyPayment: number;
  payoff: CreditPayoffEstimate;
  /** For target_date: computed payment to meet target month; otherwise same as monthlyPayment. */
  impliedMonthlyPayment?: number;
}

/**
 * Live comparison for a single linked credit goal. Avalanche and snowball use the payments you pass
 * (defaults typically goal.monthlyTarget). Target date uses minimum payment to finish by targetMonth.
 */
export function buildCreditStrategyScenarios(input: {
  debt: number;
  apr: number | null;
  /** Default pace / "your plan" payment. */
  baselineMonthlyPayment: number;
  avalancheMonthlyPayment: number;
  snowballMonthlyPayment: number;
  /** yyyy-MM; if set, target_date scenario uses computed payment to meet this month. */
  targetPayoffMonth: string | null;
  /** yyyy-MM anchor for counting months to target (usually selected budget/current month). */
  projectionStartMonth: string;
}): CreditStrategyScenario[] {
  const debt = Math.max(0, Math.round(input.debt));
  const baseline = Math.max(0, Math.round(input.baselineMonthlyPayment));
  const av = Math.max(0, Math.round(input.avalancheMonthlyPayment));
  const sb = Math.max(0, Math.round(input.snowballMonthlyPayment));

  const maxMonths =
    input.targetPayoffMonth != null
      ? inclusiveCalendarMonthsFromStartToTarget(input.projectionStartMonth, input.targetPayoffMonth)
      : null;

  const targetPayment =
    maxMonths != null ? minimumMonthlyPaymentForMaxMonths({ debt, apr: input.apr, maxMonths }) : null;

  const avalanchePayoff = estimateCreditPayoff({ debt, apr: input.apr, monthlyPayment: av });
  const snowballPayoff = estimateCreditPayoff({ debt, apr: input.apr, monthlyPayment: sb });

  const targetDatePayment = targetPayment ?? baseline;
  const targetPayoff = estimateCreditPayoff({
    debt,
    apr: input.apr,
    monthlyPayment: targetDatePayment,
  });

  return [
    {
      strategy: "avalanche",
      monthlyPayment: av,
      payoff: avalanchePayoff,
    },
    {
      strategy: "snowball",
      monthlyPayment: sb,
      payoff: snowballPayoff,
    },
    {
      strategy: "target_date",
      monthlyPayment: targetDatePayment,
      payoff: targetPayoff,
      impliedMonthlyPayment: targetPayment ?? undefined,
    },
  ];
}

export interface HorizonSliderScenario {
  horizonMonths: number;
  minimumMonthlyPayment: number | null;
  payoffAtMinimum: CreditPayoffEstimate;
  planPayoff: CreditPayoffEstimate;
  /** minimumMonthlyPayment - planPayment (negative = lower monthly at this longer horizon). */
  paymentVersusPlanMinor: number | null;
  /** Interest at horizon minimum payment minus interest at your plan payment. */
  interestVersusPlanMinor: number;
  /** One fewer month allowed: pay more per month, usually less total interest. */
  shorterHorizon: null | {
    horizonMonths: number;
    minimumMonthlyPayment: number | null;
    payoffAtMinimum: CreditPayoffEstimate;
    extraMonthlyVersusSelectedMinor: number | null;
    interestSavedVersusSelectedMinor: number;
  };
}

/**
 * Live-only: minimum payment to clear debt within `horizonMonths`, vs plan payment, vs one month tighter.
 */
export function buildHorizonSliderScenario(input: {
  debt: number;
  apr: number | null;
  horizonMonths: number;
  planMonthlyPayment: number;
}): HorizonSliderScenario {
  const debt = Math.max(0, Math.round(input.debt));
  const planPayment = Math.max(0, Math.round(input.planMonthlyPayment));
  const h = Math.max(1, Math.floor(input.horizonMonths));

  const minPay = minimumMonthlyPaymentForMaxMonths({ debt, apr: input.apr, maxMonths: h });
  const payoffAtMinimum =
    minPay != null
      ? estimateCreditPayoff({ debt, apr: input.apr, monthlyPayment: minPay })
      : { months: null, totalInterest: 0, monthlyPayment: 0, debt };

  const planPayoff = estimateCreditPayoff({ debt, apr: input.apr, monthlyPayment: planPayment });

  const paymentVersusPlanMinor = minPay != null ? minPay - planPayment : null;
  const interestVersusPlanMinor = payoffAtMinimum.totalInterest - planPayoff.totalInterest;

  let shorterHorizon: HorizonSliderScenario["shorterHorizon"] = null;
  if (h > 1) {
    const hShort = h - 1;
    const minShort = minimumMonthlyPaymentForMaxMonths({ debt, apr: input.apr, maxMonths: hShort });
    const payoffShort =
      minShort != null
        ? estimateCreditPayoff({ debt, apr: input.apr, monthlyPayment: minShort })
        : { months: null, totalInterest: 0, monthlyPayment: 0, debt };
    const extraMonthly =
      minPay != null && minShort != null ? minShort - minPay : null;
    const interestSavedVersusSelected = payoffAtMinimum.totalInterest - payoffShort.totalInterest;
    shorterHorizon = {
      horizonMonths: hShort,
      minimumMonthlyPayment: minShort,
      payoffAtMinimum: payoffShort,
      extraMonthlyVersusSelectedMinor: extraMonthly,
      interestSavedVersusSelectedMinor: interestSavedVersusSelected,
    };
  }

  return {
    horizonMonths: h,
    minimumMonthlyPayment: minPay,
    payoffAtMinimum,
    planPayoff,
    paymentVersusPlanMinor,
    interestVersusPlanMinor,
    shorterHorizon,
  };
}

