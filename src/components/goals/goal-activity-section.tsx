"use client";

import type { GoalActivityRow } from "@/lib/services/goal-detail.service";
import type { GoalContributionKind } from "@/lib/types";
import { formatRand } from "@/lib/utils/currency";

function kindLabel(kind: GoalContributionKind): string {
  switch (kind) {
    case "contribution":
      return "Contribution";
    case "withdrawal":
      return "Withdrawal";
    case "payment":
      return "Payment";
    case "interest":
      return "Interest";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function signedAmount(kind: GoalContributionKind, amount: number): { sign: string; value: number } {
  if (kind === "withdrawal" || kind === "payment") return { sign: "-", value: amount };
  if (kind === "contribution") return { sign: "+", value: amount };
  if (kind === "interest") return { sign: "+", value: amount };
  return { sign: "", value: amount };
}

export function GoalActivitySection({
  rows,
  total,
  limit,
  offset,
  onLoadMore,
}: {
  rows: GoalActivityRow[];
  total: number;
  limit: number;
  offset: number;
  onLoadMore?: () => void;
}) {
  return (
    <section className="rounded-xl border-2 border-solid bg-card p-4 shadow-sm" aria-label="Activity">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Activity</h2>
        <span className="text-xs text-muted-foreground">
          {rows.length} of {total} (ledger-linked)
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No movements recorded for this goal yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {rows.map((r) => {
            const { sign, value } = signedAmount(r.kind, r.amount);
            const impact = r.savingsImpactSummary ?? r.creditImpactSummary;
            return (
              <li
                key={r.id}
                className="rounded-lg border border-solid bg-background/60 p-3 text-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold tabular-nums">
                    {sign} {formatRand(value)}
                  </span>
                  <span className="text-muted-foreground">{kindLabel(r.kind)}</span>
                </div>
                {r.counterpartyLabel && (
                  <p className="mt-1 text-xs text-muted-foreground">{r.counterpartyLabel}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">Date: {r.effectiveDate}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Transaction #{r.accountTransactionId}
                </p>
                {impact && <p className="mt-2 border-l-2 border-primary/50 pl-2 text-xs text-muted-foreground">{impact}</p>}
              </li>
            );
          })}
        </ul>
      )}
      {offset + rows.length < total && onLoadMore && (
        <button
          type="button"
          className="mt-3 text-sm font-medium text-primary underline-offset-4 hover:underline"
          onClick={onLoadMore}
        >
          Load more
        </button>
      )}
    </section>
  );
}
