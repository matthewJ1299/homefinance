import Link from "next/link";
import { formatRand } from "@/lib/utils/currency";
import type { BudgetCategoryRow } from "@/lib/services/budget.service";

interface BudgetWarningTileProps {
  overspentCategories: BudgetCategoryRow[];
}

export function BudgetWarningTile({ overspentCategories }: BudgetWarningTileProps) {
  const sorted = [...overspentCategories].sort((a, b) => (-a.remaining) - (-b.remaining));
  const top = sorted.slice(0, 3);
  const remainingCount = Math.max(0, sorted.length - top.length);
  const hasOverspent = top.length > 0;

  return (
    <section aria-label="Over budget this month">
      <Link
        href="/budget"
        className={[
          "block rounded-xl border bg-card p-3 sm:p-4 text-sm shadow-sm hover:bg-accent/30 transition-colors",
          hasOverspent ? "border-destructive/40" : "border-border",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold">Over budget</div>
          </div>
          <div
            className={[
              "shrink-0 rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 text-xs font-medium",
              hasOverspent ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
            ].join(" ")}
          >
            {hasOverspent ? "Alert" : "OK"}
          </div>
        </div>

        {hasOverspent ? (
          <ul className="mt-2.5 sm:mt-3 space-y-1">
            {top.map((c) => (
              <li key={c.categoryId} className="flex items-center justify-between gap-3">
                <span className="truncate text-muted-foreground">{c.categoryName}</span>
                <span className="text-destructive font-medium tabular-nums shrink-0">
                  {formatRand(-c.remaining)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2.5 sm:mt-3 text-sm text-muted-foreground">No categories are over budget.</p>
        )}

        {remainingCount > 0 ? (
          <div className="mt-2 text-xs text-muted-foreground">+{remainingCount} more</div>
        ) : null}
      </Link>
    </section>
  );
}
