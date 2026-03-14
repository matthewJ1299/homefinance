import Link from "next/link";
import { formatRand } from "@/lib/utils/currency";
import type { BudgetCategoryRow } from "@/lib/services/budget.service";

interface BudgetWarningTileProps {
  overspentCategories: BudgetCategoryRow[];
}

export function BudgetWarningTile({ overspentCategories }: BudgetWarningTileProps) {
  if (overspentCategories.length === 0) return null;

  return (
    <section>
      <Link
        href="/budget"
        className="block rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-card-foreground shadow-sm hover:bg-destructive/20"
      >
        <p className="font-medium text-destructive mb-2">Over budget this month</p>
        <ul className="space-y-1">
          {overspentCategories.map((c) => (
            <li key={c.categoryId} className="flex justify-between">
              <span>{c.categoryName}</span>
              <span className="text-destructive font-medium">
                {formatRand(-c.remaining)} over
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground mt-2">Tap to open Budget</p>
      </Link>
    </section>
  );
}
