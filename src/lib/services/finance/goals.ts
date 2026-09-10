/**
 * Retained pure helpers, currently exercised only by the test suite.
 *
 * Their callers went with the pre-0043 goals model (savings/credit goals as
 * their own tables). The maths is correct and covered, and a debt-payoff view
 * would need it again, so it stays rather than being rewritten from scratch --
 * but nothing in the running app imports it today.
 */
export function updateGoal(input: { current: number; contribution: number }): number {
  return input.current + input.contribution;
}

export function calculateProgressPct(input: { current: number; target: number | null }): number {
  const target = input.target ?? 0;
  if (target <= 0) return 0;
  return Math.max(0, Math.min(1, input.current / target));
}

export function calculateMonthsToGoal(input: {
  remaining: number;
  monthly: number;
}): number | null {
  const remaining = Math.max(0, input.remaining);
  if (remaining === 0) return 0;
  if (input.monthly <= 0) return null;
  return Math.ceil(remaining / input.monthly);
}

export function projectGoalOverTime(input: {
  startingBalance: number;
  monthlyContribution: number;
  rate: number;
  months: number;
}): number {
  let balance = input.startingBalance;
  const months = Math.max(0, Math.floor(input.months));
  for (let i = 0; i < months; i++) {
    // Simple compounding: balance grows by rate, then contribution is added.
    balance = balance * (1 + input.rate) + input.monthlyContribution;
  }
  return balance;
}

