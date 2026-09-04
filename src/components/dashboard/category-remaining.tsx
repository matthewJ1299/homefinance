import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatRand } from "@/lib/utils/currency";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";

export interface CategoryRemainingRow {
  categoryId: number;
  categoryName: string;
  available: number;
  assigned: number;
  carriedIn: number;
  spent: number;
  rollover: boolean;
  groupName: string;
}

export function CategoryRemaining({
  categories,
  showCount = 5,
}: {
  categories: CategoryRemainingRow[];
  showCount?: number;
}) {
  // Most useful first: what's over, then what's tight, then the rest.
  const ordered = [...categories].sort((a, b) => {
    if (a.available < 0 !== b.available < 0) return a.available < 0 ? -1 : 1;
    const capA = a.assigned + a.carriedIn;
    const capB = b.assigned + b.carriedIn;
    return (capA ? a.available / capA : 1) - (capB ? b.available / capB : 1);
  });

  return (
    <section className="space-y-2.5">
      <SectionHeader
        title="What's left, by category"
        action={
          <Link href="/budget" className="text-xs font-semibold text-primary">
            All {categories.length}
          </Link>
        }
      />
      <Card className="rounded-2xl px-3.5 py-1.5">
        {ordered.slice(0, showCount).map((c) => {
          const cap = c.assigned + c.carriedIn;
          const isOver = c.available < 0;
          // "saved" instead of "left" for sinking funds. R3 600 *left* in Car
          // service sounds like budget you failed to spend; R3 600 *saved* is
          // the thing you are pleased about.
          const isSaving = c.groupName === "Saving up" || (c.carriedIn > 0 && c.spent === 0);
          return (
            <div key={c.categoryId} className="space-y-1.5 border-b border-border/50 py-3 last:border-0">
              <div className="flex items-baseline justify-between gap-2.5">
                <div className="min-w-0">
                  <span className="text-sm font-medium">{c.categoryName}</span>
                  {c.carriedIn > 0 ? (
                    <span className="block text-[11px] text-muted-foreground">
                      {formatRand(c.carriedIn)} carried over
                    </span>
                  ) : null}
                </div>
                <span
                  className={cn(
                    "shrink-0 text-sm font-semibold tabular-nums",
                    isOver ? "text-destructive" : "text-primary"
                  )}
                >
                  {isOver
                    ? `${formatRand(Math.abs(c.available))} over`
                    : `${formatRand(c.available)} ${isSaving ? "saved" : "left"}`}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    isOver ? "bg-destructive" : "bg-primary"
                  )}
                  style={{ width: `${cap > 0 ? Math.min(100, (c.spent / cap) * 100) : 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </Card>
    </section>
  );
}
