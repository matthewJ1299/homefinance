"use client";

import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatRand } from "@/lib/utils/currency";
import type { SpreadPlan } from "@/lib/services/budget.service";

interface SpreadPreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SpreadPlan | null;
  pending: boolean;
  onConfirm: () => void;
}

/**
 * Shows exactly what "Spread it for me" will change before it writes anything.
 * The plan is computed on open; the write recomputes on confirm, so this is a
 * faithful preview rather than a promise.
 */
export function SpreadPreviewSheet({
  open,
  onOpenChange,
  plan,
  pending,
  onConfirm,
}: SpreadPreviewSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} label="Spread preview">
      <div className="px-4 pb-2">
        <h3 className="text-lg font-semibold">
          Spread {plan ? formatRand(plan.total) : ""} across your budget
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {plan?.weightedByHistory
            ? "Weighted by your last 6 months of spending."
            : "Split evenly across your categories."}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <ul className="divide-y divide-border">
          {(plan?.items ?? []).map((item) => (
            <li key={item.categoryId} className="flex items-center justify-between gap-3 py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {item.categoryName}
              </span>
              <span className="shrink-0 text-sm font-semibold text-success tabular-nums">
                +{formatRand(item.increment)}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                → {formatRand(item.newAssigned)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-2 border-t border-border bg-sheet px-4 py-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={pending}
          className="h-11 flex-1 rounded-full"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={pending || !plan || plan.items.length === 0}
          className="h-11 flex-1 rounded-full bg-emphasis text-emphasis-foreground"
        >
          {pending ? "Spreading…" : "Confirm"}
        </Button>
      </div>
    </Sheet>
  );
}
