import Link from "next/link";
import { formatRand } from "@/lib/utils/currency";
import type { BudgetCategoryRow } from "@/lib/services/budget.service";
import { CollapsibleSection } from "@/components/ui/collapsible-section";

interface BudgetWarningTileProps {
  overspentCategories: BudgetCategoryRow[];
}

export function BudgetWarningTile({ overspentCategories }: BudgetWarningTileProps) {
  if (overspentCategories.length === 0) return null;

  return (
    <section>
      <CollapsibleSection title="Over budget this month" defaultOpen={false}>
        <Link
          href="/budget"
          className="block rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-card-foreground shadow-sm hover:bg-destructive/20"
        >
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
      </CollapsibleSection>
    </section>
  );
}
