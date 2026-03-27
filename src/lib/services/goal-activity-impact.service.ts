import { estimateCreditPayoff } from "@/lib/services/finance/credit";
import { calculateMonthsToGoal } from "@/lib/services/finance/goals";
import { projectSavingsGoalCompletionMonth } from "@/lib/services/finance/projections";
import type { GoalContribution, GoalContributionKind } from "@/lib/types";

export interface SavingsRowImpact {
  kind: GoalContributionKind;
  /** Pull-in is positive months (completed sooner). */
  completionMonthDeltaApprox: number | null;
  summary: string | null;
}

export interface CreditRowImpact {
  kind: GoalContributionKind;
  payoffMonthsDelta: number | null;
  totalInterestDeltaMinor: number | null;
  summary: string | null;
}

export class GoalActivityImpactService {
  buildSavingsImpacts(input: {
    targetAmount: number;
    eventsAsc: GoalContribution[];
    monthlyPace: number;
    fallbackAnchorMonth: string;
  }): Map<number, SavingsRowImpact> {
    const map = new Map<number, SavingsRowImpact>();
    const pace = Math.max(0, input.monthlyPace);
    let saved = 0;

    for (const e of input.eventsAsc) {
      if (e.kind !== "contribution" && e.kind !== "withdrawal") {
        map.set(e.id, { kind: e.kind, completionMonthDeltaApprox: null, summary: null });
        continue;
      }

      const before = saved;
      if (e.kind === "contribution") saved += e.amount;
      else saved -= e.amount;

      const remainingBefore = Math.max(0, input.targetAmount - before);
      const remainingAfter = Math.max(0, input.targetAmount - saved);

      let deltaMonths: number | null = null;
      if (pace > 0) {
        const mb = calculateMonthsToGoal({ remaining: remainingBefore, monthly: pace });
        const ma = calculateMonthsToGoal({ remaining: remainingAfter, monthly: pace });
        if (mb != null && ma != null) deltaMonths = mb - ma;
      }

      const rowMonth = e.effectiveDate.length >= 7 ? e.effectiveDate.slice(0, 7) : input.fallbackAnchorMonth;
      const monthBefore = projectSavingsGoalCompletionMonth({
        month: rowMonth,
        remaining: remainingBefore,
        monthlyTarget: pace,
      });
      const monthAfter = projectSavingsGoalCompletionMonth({
        month: rowMonth,
        remaining: remainingAfter,
        monthlyTarget: pace,
      });

      let summary: string | null = null;
      if (e.kind === "contribution" && deltaMonths != null && deltaMonths > 0) {
        summary = `About ${deltaMonths} month(s) sooner at your monthly target pace`;
      } else if (e.kind === "withdrawal" && deltaMonths != null && deltaMonths < 0) {
        summary = `About ${-deltaMonths} month(s) later at your monthly target pace`;
      } else if (monthBefore && monthAfter && monthBefore !== monthAfter) {
        summary = `Completion moves from ${monthBefore} to ${monthAfter}`;
      }

      map.set(e.id, {
        kind: e.kind,
        completionMonthDeltaApprox: deltaMonths,
        summary,
      });
    }

    return map;
  }

  buildCreditImpacts(input: {
    eventsAsc: GoalContribution[];
    currentDebt: number;
    apr: number | null;
    baselineMonthlyPayment: number;
  }): Map<number, CreditRowImpact> {
    const map = new Map<number, CreditRowImpact>();
    const payment = Math.max(0, Math.round(input.baselineMonthlyPayment));
    let d = Math.max(0, Math.round(input.currentDebt));

    for (let i = input.eventsAsc.length - 1; i >= 0; i--) {
      const e = input.eventsAsc[i]!;
      if (e.kind === "payment") d += e.amount;
      else if (e.kind === "interest") d -= e.amount;
    }

    for (const e of input.eventsAsc) {
      if (e.kind !== "payment" && e.kind !== "interest") {
        map.set(e.id, { kind: e.kind, payoffMonthsDelta: null, totalInterestDeltaMinor: null, summary: null });
        continue;
      }

      const debtBefore = Math.max(0, d);
      let debtAfter = debtBefore;
      if (e.kind === "payment") debtAfter = Math.max(0, debtBefore - e.amount);
      else debtAfter = debtBefore + e.amount;

      const before = estimateCreditPayoff({ debt: debtBefore, apr: input.apr, monthlyPayment: payment });
      const after = estimateCreditPayoff({ debt: debtAfter, apr: input.apr, monthlyPayment: payment });

      let monthsDelta: number | null = null;
      if (before.months != null && after.months != null) monthsDelta = after.months - before.months;
      const interestDelta =
        before.totalInterest !== after.totalInterest ? after.totalInterest - before.totalInterest : null;

      let summary: string | null = null;
      if (e.kind === "payment" && monthsDelta != null && monthsDelta < 0) {
        summary = `About ${-monthsDelta} fewer month(s) to payoff at this payment level`;
      } else if (e.kind === "payment" && interestDelta != null && interestDelta < 0) {
        summary = `Roughly R${Math.round(-interestDelta / 100)} less interest (estimate)`;
      } else if (e.kind === "interest" && monthsDelta != null && monthsDelta > 0) {
        summary = `Adds about ${monthsDelta} month(s) at this payment level`;
      }

      map.set(e.id, {
        kind: e.kind,
        payoffMonthsDelta: monthsDelta,
        totalInterestDeltaMinor: interestDelta,
        summary,
      });

      d = debtAfter;
    }

    return map;
  }
}
