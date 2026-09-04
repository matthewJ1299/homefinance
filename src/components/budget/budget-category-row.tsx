"use client";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { formatRand } from "@/lib/utils/currency";
import type { BudgetCategoryRow as Row } from "@/lib/services/budget.service";

/**
 * Read-only. Every edit lives in the sheet this opens, rather than in an inline
 * input, a Save button and an expand toggle on each of eleven rows.
 */
export function BudgetCategoryRow({ c, onOpen }: { c: Row; onOpen: (id: number) => void }) {
  const cap = c.assigned + c.carriedIn;
  const isOver = c.available < 0;
  const isSaving = c.groupName === "Saving up" || (c.carriedIn > 0 && c.spent === 0);

  return (
    <button
      type="button"
      onClick={() => onOpen(c.categoryId)}
      className="w-full space-y-1.5 border-b border-border/50 py-3.5 text-left last:border-0 cursor-pointer"
    >
      <div className="flex items-baseline justify-between gap-2.5">
        <div className="min-w-0">
          <span className="text-[15px] font-medium">{c.categoryName}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
            {c.carriedIn > 0
              ? `${formatRand(c.assigned)} a month · ${formatRand(c.carriedIn)} carried over`
              : `${formatRand(c.spent)} of ${formatRand(c.assigned)}`}
          </span>
        </div>
        <div className="shrink-0 text-right">
          <span
            className={cn(
              "block text-base font-semibold tabular-nums",
              isOver ? "text-destructive" : "text-primary"
            )}
          >
            {formatRand(Math.abs(c.available))}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {isOver ? "over" : isSaving ? "saved" : "left"}
          </span>
        </div>
      </div>
      <Progress
        value={cap > 0 ? Math.min(100, (c.spent / cap) * 100) : 0}
        className={cn("h-1.5", isOver && "[&>div]:bg-destructive")}
      />
    </button>
  );
}
