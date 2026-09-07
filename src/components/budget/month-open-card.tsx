"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatRand } from "@/lib/utils/currency";
import { coverOverspend, openBudgetMonth } from "@/lib/actions/budget.actions";

export interface MonthOpenCategory {
  categoryId: number;
  categoryName: string;
  available: number;
}

/**
 * The month-end receipt.
 *
 * Deliberately not a question. There is no "is it a new month?" prompt because
 * the month has already turned -- this states what happened and lets you change
 * one thing about it. Skip still opens the month, so the defaults apply whether
 * or not anyone reads this.
 */
export function MonthOpenCard({
  month,
  previous,
  previousLabel,
  monthLabel,
  overspent,
  carrying,
  startsWith,
  carriedOverspend,
  skippedMonths,
}: {
  month: string;
  previous: string;
  previousLabel: string;
  monthLabel: string;
  overspent: MonthOpenCategory[];
  carrying: MonthOpenCategory[];
  /** Already assigned in the new month, before anything is carried in. */
  startsWith: number;
  /** Overspend nobody covered. Comes off the new month's unassigned money. */
  carriedOverspend: number;
  /** Months opened alongside this one because the app was not used. */
  skippedMonths?: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [coverFrom, setCoverFrom] = useState<number | null>(carrying[0]?.categoryId ?? null);

  const overspentTotal = overspent.reduce((s, c) => s + Math.abs(c.available), 0);
  const carryingTotal = carrying.reduce((s, c) => s + c.available, 0);
  const source = carrying.find((c) => c.categoryId === coverFrom) ?? null;

  function start() {
    startTransition(async () => {
      const res = await openBudgetMonth(month);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      // Refresh before navigating: the client router can otherwise serve a
      // cached /dashboard from before the month was opened, which bounces
      // straight back here.
      router.refresh();
      router.replace("/dashboard");
    });
  }

  function coverAll() {
    if (!source) return;
    startTransition(async () => {
      for (const c of overspent) {
        const amount = Math.min(Math.abs(c.available), source.available);
        if (amount <= 0) continue;
        const res = await coverOverspend({
          fromCategoryId: source.categoryId,
          toCategoryId: c.categoryId,
          month: previous,
          amount,
        });
        if (!res.success) {
          toast.error(res.error);
          return;
        }
      }
      toast.success(`Covered from ${source.categoryName}.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">New month</h1>
        <button
          type="button"
          onClick={start}
          disabled={pending}
          className="min-h-11 cursor-pointer px-1 text-sm font-semibold text-muted-foreground"
        >
          Skip
        </button>
      </div>

      <div>
        <p className="text-base font-semibold">{previousLabel} is done</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {overspent.length > 0 ? (
            <>
              {overspent.length === 1 ? "One category went" : `${overspent.length} categories went`}{" "}
              over, so {formatRand(overspentTotal)} comes off {monthLabel} unless you cover it.
            </>
          ) : (
            <>Nothing went over. {formatRand(carryingTotal)} carries into the same categories.</>
          )}
        </p>
      </div>

      {skippedMonths && skippedMonths.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Also opening {skippedMonths.length === 1 ? "the month" : "the months"} you missed, so
          what was left over carries all the way through.
        </p>
      ) : null}

      {overspent.length > 0 ? (
        <Card className="rounded-2xl border-destructive/40 bg-destructive/[0.06] p-4">
          <p className="text-[13px] font-semibold text-destructive">
            Went over · {formatRand(overspentTotal)}
          </p>
          <ul className="mt-2">
            {overspent.map((c) => (
              <li
                key={c.categoryId}
                className="flex justify-between border-b border-border/40 py-2 text-sm last:border-0"
              >
                <span>{c.categoryName}</span>
                <span className="tabular-nums">{formatRand(Math.abs(c.available))}</span>
              </li>
            ))}
          </ul>
          {/* Two explicit buttons rather than a silent default: taking it off
              next month is a real choice, not a fallback. */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {carrying.length > 0 ? (
              <>
                <select
                  value={coverFrom ?? ""}
                  onChange={(e) => setCoverFrom(Number(e.target.value))}
                  aria-label="Cover from"
                  className="min-h-11 rounded-full border border-border bg-card px-3 text-sm cursor-pointer"
                >
                  {carrying.map((c) => (
                    <option key={c.categoryId} value={c.categoryId}>
                      {c.categoryName} ({formatRand(c.available)})
                    </option>
                  ))}
                </select>
                <Button
                  onClick={coverAll}
                  disabled={pending || !source}
                  className="h-11 rounded-full bg-emphasis px-4 text-emphasis-foreground"
                >
                  Cover it
                </Button>
              </>
            ) : null}
            <Button
              variant="outline"
              onClick={start}
              disabled={pending}
              className="h-11 rounded-full px-4"
            >
              Take off {monthLabel}
            </Button>
          </div>
        </Card>
      ) : null}

      {carrying.length > 0 ? (
        <Card className="rounded-2xl border-success/35 bg-success-surface p-4">
          <p className="text-[13px] font-semibold text-success">
            Carrying over · {formatRand(carryingTotal)}
          </p>
          <ul className="mt-2">
            {carrying.map((c) => (
              <li
                key={c.categoryId}
                className="flex justify-between border-b border-border/40 py-2 text-sm last:border-0"
              >
                <span>{c.categoryName}</span>
                <span className="tabular-nums">{formatRand(c.available)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="rounded-2xl p-4">
        <p className="text-[13px] font-semibold text-muted-foreground">
          {monthLabel} starts with
        </p>
        <p className={cn("mt-2 text-2xl font-semibold tabular-nums")}>
          {formatRand(startsWith)} already assigned
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          From your usual amounts. Change any of it any time.
        </p>
        {carriedOverspend > 0 ? (
          <p className="mt-3 border-t border-border/40 pt-3 text-sm text-warning">
            Less {formatRand(carriedOverspend)} of overspend nobody covered, taken off
            {" "}{monthLabel}&rsquo;s unassigned money.
          </p>
        ) : null}
      </Card>

      <Button onClick={start} disabled={pending} className="h-12 w-full rounded-xl text-base">
        {pending ? "Starting…" : `Start ${monthLabel}`}
      </Button>
    </div>
  );
}
