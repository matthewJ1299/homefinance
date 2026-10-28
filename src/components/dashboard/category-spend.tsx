import Link from "next/link";
import { formatRand } from "@/lib/utils/currency";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";

export interface CategorySpendRow {
  categoryId: number;
  categoryName: string;
  spent: number;
}

/**
 * Tracker-mode counterpart to `CategoryRemaining`: categorized actuals with no
 * envelope layer. Budgeting is the assignment layer on top of this -- turn it
 * off and the spend-by-category view is what stays. Bars are relative to the
 * biggest spender, so they read as "where it went" rather than "how much of a
 * target".
 */
export function CategorySpend({
  categories,
  showCount = 5,
}: {
  categories: CategorySpendRow[];
  showCount?: number;
}) {
  const withSpend = categories.filter((c) => c.spent > 0).sort((a, b) => b.spent - a.spent);
  const max = withSpend[0]?.spent ?? 0;

  if (withSpend.length === 0) {
    return (
      <section className="space-y-2.5">
        <SectionHeader title="Spent this month" />
        <Card className="rounded-2xl px-4 py-6">
          <p className="text-sm text-muted-foreground">
            Nothing spent yet this month. Add a transaction to see it here.
          </p>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-2.5">
      <SectionHeader
        title="Spent this month"
        action={
          <Link href="/expenses" className="text-xs font-semibold text-primary">
            All {withSpend.length}
          </Link>
        }
      />
      <Card className="rounded-2xl px-3.5 py-1.5">
        {withSpend.slice(0, showCount).map((c) => (
          <div key={c.categoryId} className="space-y-1.5 border-b border-border/50 py-3 last:border-0">
            <div className="flex items-baseline justify-between gap-2.5">
              <span className="min-w-0 truncate text-sm font-medium">{c.categoryName}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                {formatRand(c.spent)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${max > 0 ? Math.min(100, (c.spent / max) * 100) : 0}%` }}
              />
            </div>
          </div>
        ))}
      </Card>
    </section>
  );
}
