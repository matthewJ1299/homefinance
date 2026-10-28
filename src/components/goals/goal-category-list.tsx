"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRand } from "@/lib/utils/currency";
import { BudgetCategorySheet } from "@/components/budget/budget-category-sheet";
import type { GoalCategoryRow } from "@/lib/services/finance/goal-categories";
import type { BudgetCategoryRow } from "@/lib/services/budget.service";

/**
 * /goals is a filtered view of the budget: categories that carry a target.
 *
 * Assigning to a goal is the normal assign flow -- the same sheet the Budget
 * page opens -- so there is no second way to move money and no second set of
 * figures to keep in step.
 */
export function GoalCategoryList({
  rows,
  categories,
  month,
}: {
  rows: GoalCategoryRow[];
  /** The full budget rows, so the sheet has everything it needs. */
  categories: BudgetCategoryRow[];
  month: string;
}) {
  const [sheetCategoryId, setSheetCategoryId] = useState<number | null>(null);
  const sheetCategory = categories.find((c) => c.categoryId === sheetCategoryId) ?? null;

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No goals yet"
        message="Give a category a target and a date and it becomes a goal. Money you assign to it is money saved."
      />
    );
  }

  return (
    <>
      <Card className="rounded-2xl px-3.5 py-1.5">
        {rows.map((r) => (
          <button
            key={r.categoryId}
            type="button"
            onClick={() => setSheetCategoryId(r.categoryId)}
            className="w-full space-y-1.5 border-b border-border/50 py-3.5 text-left last:border-0 cursor-pointer"
          >
            <div className="flex items-baseline justify-between gap-2.5">
              <div className="min-w-0">
                <span className="text-[15px] font-medium">{r.categoryName}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                  {formatRand(r.available)} of {formatRand(r.targetMinor)}
                  {r.monthsLeft != null
                    ? ` · ${r.monthsLeft} month${r.monthsLeft === 1 ? "" : "s"} left`
                    : ""}
                </span>
              </div>
              <div className="shrink-0 text-right">
                <span
                  className={cn(
                    "block text-base font-semibold tabular-nums",
                    r.onTrack ? "text-success" : "text-warning"
                  )}
                >
                  {r.monthlyNeeded === 0 ? "Done" : `${formatRand(r.monthlyNeeded)}/mo`}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {r.monthlyNeeded === 0
                    ? "target reached"
                    : r.onTrack
                      ? "covered this month"
                      : `${formatRand(r.shortfall)} short`}
                </span>
              </div>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", r.onTrack ? "bg-success" : "bg-warning")}
                style={{ width: `${r.progress * 100}%` }}
              />
            </div>
          </button>
        ))}
      </Card>

      <BudgetCategorySheet
        open={sheetCategory != null}
        onOpenChange={(open) => !open && setSheetCategoryId(null)}
        category={sheetCategory}
        month={month}
        lastMonthAssigned={0}
        targetMinor={rows.find((r) => r.categoryId === sheetCategoryId)?.targetMinor ?? null}
        targetDate={rows.find((r) => r.categoryId === sheetCategoryId)?.targetDate ?? null}
        transactions={[]}
        onMoveMoney={() => setSheetCategoryId(null)}
      />
    </>
  );
}
