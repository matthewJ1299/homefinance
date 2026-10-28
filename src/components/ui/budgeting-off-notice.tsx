import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

/**
 * Shown when a budget-cluster page (`/budget`, `/goals`, `/budget-ai-report`) is
 * reached by URL while the user has budgeting switched off. Unlike
 * `FeatureUnavailable` -- which is about what the household was sold and points
 * at an admin -- this is the user's own preference, so it points back at their
 * Settings toggle and reassures that nothing was deleted.
 */
export function BudgetingOffNotice({ title = "Budgeting is off" }: { title?: string }) {
  return (
    <div className="space-y-4" data-testid="budgeting-off">
      <PageHeader title={title} />
      <p className="max-w-lg text-sm text-muted-foreground">
        You&apos;ve switched budgeting off, so envelopes, goals, and the budget report are
        hidden. Your budget is kept — turn budgeting back on in Settings to bring it back.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/settings"
          className={cn(
            "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium",
            "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          Go to Settings
        </Link>
        <Link
          href="/dashboard"
          className={cn(
            "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium",
            "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
