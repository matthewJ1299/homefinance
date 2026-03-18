import { addMonths, format } from "date-fns";
import { calculateMonthsToGoal } from "./goals";
import { estimateCreditPayoff } from "./credit";

export function projectSavingsGoalCompletionMonth(input: {
  month: string; // YYYY-MM
  remaining: number;
  monthlyTarget: number;
}): string | null {
  const remaining = Math.max(0, input.remaining);
  if (remaining === 0) return input.month;

  const monthsToGoal = calculateMonthsToGoal({ remaining, monthly: input.monthlyTarget });
  if (monthsToGoal == null) return null;

  const [y, m] = input.month.split("-").map(Number);
  const start = new Date(y, (m ?? 1) - 1, 1);
  return format(addMonths(start, monthsToGoal), "yyyy-MM");
}

export function estimateCreditPayoffTimeline(input: {
  debt: number;
  apr: number | null;
  monthlyPayment: number;
}): ReturnType<typeof estimateCreditPayoff> {
  return estimateCreditPayoff(input);
}

