"use client";

import type { GoalDetailResponse } from "@/lib/services/goal-detail.service";
import { formatRand } from "@/lib/utils/currency";

export function GoalProgressSection({ detail }: { detail: GoalDetailResponse }) {
  const { actual, projected } = detail;

  if (actual.type === "savings") {
    return (
      <section className="rounded-xl border-2 border-solid bg-card p-4 shadow-sm" aria-label="Progress and targets">
        <h2 className="text-sm font-medium text-muted-foreground">Progress and monthly tracking</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Monthly target</dt>
            <dd className="font-medium tabular-nums">{formatRand(actual.monthlyTarget)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">This month (net)</dt>
            <dd className="font-medium tabular-nums">{formatRand(actual.monthlyActual)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Remaining this month</dt>
            <dd className="font-medium tabular-nums">{formatRand(actual.remainingThisMonth)}</dd>
          </div>
        </dl>
        {projected.type === "savings" && (
          <div className="mt-4 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-3 text-sm text-muted-foreground">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">Projected impact</p>
            <p className="mt-1">
              If you stay behind this pace vs your monthly target, your completion date shifts versus the plan shown in
              Projection (computed live).
            </p>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-xl border-2 border-solid bg-card p-4 shadow-sm" aria-label="Progress and targets">
      <h2 className="text-sm font-medium text-muted-foreground">Progress and monthly tracking</h2>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Plan payment</dt>
          <dd className="font-medium tabular-nums">{formatRand(actual.recommendedPayment)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Paid this month</dt>
          <dd className="font-medium tabular-nums">{formatRand(actual.paidThisMonth)}</dd>
        </div>
        {actual.shortVsRecommended > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Short vs plan</dt>
            <dd className="font-medium tabular-nums text-amber-700 dark:text-amber-300">
              {formatRand(actual.shortVsRecommended)}
            </dd>
          </div>
        )}
      </dl>
      <div className="mt-4 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-3 text-sm text-muted-foreground">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">Projected impact</p>
        <p className="mt-1">
          Paying less than the plan extends payoff and increases interest. Open Projection to compare payments and
          strategies (live estimates).
        </p>
      </div>
    </section>
  );
}
