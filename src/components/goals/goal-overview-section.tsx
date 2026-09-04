"use client";

import type { GoalDetailResponse } from "@/lib/services/goal-detail.service";
import { formatRand } from "@/lib/utils/currency";

export function GoalOverviewSection({ detail }: { detail: GoalDetailResponse }) {
  const { goal, actual, projected } = detail;

  if (actual.type === "savings") {
    const pct = Math.round(actual.progressPct * 100);
    return (
      <section className="rounded-xl border-2 border-solid bg-card p-4 shadow-sm" aria-label="Overview">
        <h2 className="text-sm font-medium text-muted-foreground">Overview</h2>
        <p className="mt-1 text-lg font-semibold">{goal.name}</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums">
          {formatRand(actual.current)} / {formatRand(actual.target)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{pct}% of target</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {actual.onTrack ? (
            <span className="rounded-md bg-success-surface px-2 py-1 text-success">
              On track this month
            </span>
          ) : (
            <span className="rounded-md bg-amber-500/15 px-2 py-1 text-amber-800 dark:text-amber-200">
              Behind by {formatRand(actual.behindAmountThisMonth)} this month
            </span>
          )}
        </div>
        {projected.type === "savings" && projected.projectedCompletionMonth && (
          <p className="mt-3 text-sm text-muted-foreground">
            Estimated completion:{" "}
            <span className="font-medium text-foreground">{projected.projectedCompletionMonth}</span>
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-xl border-2 border-solid bg-card p-4 shadow-sm" aria-label="Overview">
      <h2 className="text-sm font-medium text-muted-foreground">Overview</h2>
      <p className="mt-1 text-lg font-semibold">{goal.name}</p>
      <p className="mt-2 text-sm text-muted-foreground">Credit goal</p>
      <p className="mt-2 text-xl font-semibold tabular-nums">Debt: {formatRand(actual.debt)}</p>
      {actual.apr != null && (
        <p className="mt-1 text-sm text-muted-foreground">
          Interest rate (APR): {(Number(actual.apr) * 100).toFixed(1)}%
        </p>
      )}
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-lg border bg-background/50 p-2">
          <p className="text-xs text-muted-foreground">Suggested payment (plan)</p>
          <p className="font-medium tabular-nums">{formatRand(actual.recommendedPayment)}</p>
        </div>
        <div className="rounded-lg border bg-background/50 p-2">
          <p className="text-xs text-muted-foreground">You paid this month</p>
          <p className="font-medium tabular-nums">{formatRand(actual.paidThisMonth)}</p>
        </div>
      </div>
      {actual.shortVsRecommended > 0 ? (
        <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">
          Short by {formatRand(actual.shortVsRecommended)} vs plan this month
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">At or above plan payment this month</p>
      )}
      {actual.payoffMonths != null && (
        <p className="mt-2 text-sm text-muted-foreground">
          At plan payment: about {actual.payoffMonths} month(s) to payoff, roughly{" "}
          {formatRand(actual.totalInterestMinor)} interest (estimate)
        </p>
      )}
    </section>
  );
}
