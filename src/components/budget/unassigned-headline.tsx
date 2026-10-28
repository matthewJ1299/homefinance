"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatRand } from "@/lib/utils/currency";
import { formatDisplayDate } from "@/lib/utils/date";
import type { BudgetIncomeBreakdown } from "@/lib/services/budget.service";

/**
 * The Budget page's one headline. Replaces the donut, the four-stat grid and
 * the unallocated banner, which between them stated the same figures four
 * times. Tapping it opens a mini-statement that traces the figure back to the
 * income, assignments and overspend that make it up.
 */
export function UnassignedHeadline({
  unassigned,
  carriedOverspend,
  overspentTotal,
  totalAssigned,
  incomeBreakdown,
  rolledIntoEnvelopes,
  onSpread,
  onCover,
  pending = false,
}: {
  unassigned: number;
  carriedOverspend: number;
  overspentTotal: number;
  totalAssigned: number;
  incomeBreakdown: BudgetIncomeBreakdown;
  rolledIntoEnvelopes: number;
  onSpread: () => void;
  onCover: () => void;
  pending?: boolean;
}) {
  const [statementOpen, setStatementOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);
  const isOver = unassigned < 0;
  const isDone = unassigned === 0;

  if (isDone) {
    return (
      <Card className="rounded-2xl border-success/35 bg-success-surface p-4">
        <p className="text-sm font-semibold text-success">Every rand has a job</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Nothing left to assign this month.{" "}
          {overspentTotal > 0
            ? `${formatRand(overspentTotal)} is over in a category or two — worth a look below.`
            : "Nothing over, either."}
        </p>
      </Card>
    );
  }

  // Largest first, so the summary leads with "Salary" rather than a small ad-hoc.
  const entries = [...incomeBreakdown.entries].sort((a, b) => b.amount - a.amount);
  const incomeSummary =
    entries.length === 0
      ? "none logged yet"
      : entries.length === 1
        ? entries[0].label
        : `${entries[0].label} + ${entries.length - 1} more`;

  return (
    <Card
      className={cn(
        "rounded-2xl p-[18px]",
        isOver
          ? "border-destructive/40 bg-destructive/[0.06]"
          : "border-warning/40 bg-warning-surface"
      )}
    >
      <p
        className={cn(
          "text-[13px] font-semibold",
          isOver ? "text-destructive" : "text-warning"
        )}
      >
        {isOver ? "You've promised more than you have" : "Not given a job yet"}
      </p>
      <p className="mt-3 text-4xl leading-none font-semibold tracking-tight tabular-nums">
        {formatRand(Math.abs(unassigned))}
      </p>
      <p className="mt-3 text-sm leading-snug">
        {isOver
          ? "Take it back off a category, or the month starts behind."
          : "Money with nothing to do. Put it somewhere, or it just drifts."}
      </p>
      {carriedOverspend > 0 ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Includes {formatRand(carriedOverspend)} that came off last month&apos;s overspend.
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setStatementOpen((o) => !o)}
        aria-expanded={statementOpen}
        className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-foreground"
      >
        {statementOpen ? "Hide the breakdown" : "Where did this come from?"}
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", statementOpen && "rotate-180")}
          aria-hidden
        />
      </button>

      {statementOpen ? (
        <div className="mt-2 rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
          <button
            type="button"
            onClick={() => entries.length > 1 && setIncomeOpen((o) => !o)}
            aria-expanded={incomeOpen}
            className="flex w-full items-center justify-between gap-2 text-left"
          >
            <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
              <span className="truncate">Income · {incomeSummary}</span>
              {entries.length > 1 ? (
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform",
                    incomeOpen && "rotate-180"
                  )}
                  aria-hidden
                />
              ) : null}
            </span>
            <span className="shrink-0 tabular-nums text-success">
              +{formatRand(incomeBreakdown.total)}
            </span>
          </button>

          {incomeOpen ? (
            <ul className="mt-1.5 space-y-1 border-l border-border pl-3">
              {entries.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{e.label}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {e.kindLabel} · {formatDisplayDate(e.date)}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums">{formatRand(e.amount)}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Assigned to envelopes</span>
            <span className="tabular-nums text-destructive">−{formatRand(totalAssigned)}</span>
          </div>

          {carriedOverspend > 0 ? (
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Last month&apos;s overspend</span>
              <span className="tabular-nums text-destructive">−{formatRand(carriedOverspend)}</span>
            </div>
          ) : null}

          <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2 font-semibold">
            <span>{isOver ? "Over-assigned by" : "Not given a job yet"}</span>
            <span className="tabular-nums">{formatRand(Math.abs(unassigned))}</span>
          </div>

          {rolledIntoEnvelopes > 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {formatRand(rolledIntoEnvelopes)} also rolled into your envelopes from last month —
              already assigned, so it isn&apos;t counted here.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3.5 flex flex-wrap gap-2">
        <Button
          onClick={onSpread}
          disabled={pending || isOver}
          className="h-10 rounded-full bg-emphasis px-4 text-emphasis-foreground"
        >
          Spread it for me
        </Button>
        {overspentTotal > 0 ? (
          <Button
            variant="outline"
            onClick={onCover}
            disabled={pending}
            className="h-10 rounded-full px-4"
          >
            Cover the {formatRand(overspentTotal)} over
          </Button>
        ) : null}
      </div>

      <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Spread</span> — auto-assigns what&apos;s
          left, weighted by your recent spending.
        </p>
        {overspentTotal > 0 ? (
          <p>
            <span className="font-medium text-foreground">Cover</span> — moves money from a category
            with room into one that&apos;s over.
          </p>
        ) : null}
      </div>
    </Card>
  );
}
