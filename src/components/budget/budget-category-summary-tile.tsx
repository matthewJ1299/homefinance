"use client";

import { cn } from "@/lib/utils";
import { formatRand } from "@/lib/utils/currency";
import type { BudgetCategoryRow } from "@/lib/services/budget.service";

const DOT_PALETTE = [
  "bg-red-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-orange-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-cyan-500",
];

export function BudgetCategorySummaryTile({ categories }: { categories: BudgetCategoryRow[] }) {
  if (categories.length === 0) return null;

  return (
    <section
      className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-sm"
      aria-label="Spending by category summary"
    >
      <h2 className="text-sm font-semibold tracking-tight mb-4">Spending by category</h2>
      <ul className="space-y-4">
        {categories.map((cat, idx) => {
          const dot = DOT_PALETTE[idx % DOT_PALETTE.length];
          const pct =
            cat.allocated > 0 ? Math.min(100, Math.round((cat.spent / cat.allocated) * 100)) : 0;
          const widthPct = cat.allocated > 0 ? Math.min(100, (cat.spent / cat.allocated) * 100) : 0;

          return (
            <li key={cat.categoryId} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dot)}
                    aria-hidden
                  />
                  <span className="font-medium truncate tracking-tight">{cat.categoryName}</span>
                </div>
                <span
                  className={cn(
                    "tabular-nums shrink-0 font-medium",
                    cat.isOverspent ? "text-destructive" : "text-foreground"
                  )}
                >
                  {formatRand(cat.spent)}
                </span>
              </div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    cat.isOverspent ? "bg-destructive" : "bg-primary"
                  )}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <div className="text-[11px] text-muted-foreground tabular-nums">
                {pct}% of {formatRand(cat.allocated)} allocated
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
