import { cn } from "@/lib/utils";
import { formatRand } from "@/lib/utils/currency";

interface AllocationBarProps {
  allocated: number;
  spent: number;
  totalIncome: number;
  className?: string;
}

export function AllocationBar({
  allocated,
  spent,
  totalIncome,
  className,
}: AllocationBarProps) {
  const isOverspent = allocated > 0 ? spent > allocated : spent > 0;
  const pct = allocated > 0 ? spent / allocated : spent > 0 ? 1 : 0;
  const widthPct = Math.min(100, Math.round(pct * 100) / 100);

  // Keep the guard for weird cases, but prefer showing the bar even when totalIncome is 0.
  if (totalIncome < 0) return null;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full transition-all",
            isOverspent ? "bg-destructive" : "bg-primary"
          )}
          style={{ width: `${widthPct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Spent / Allocated</span>
        <span className={isOverspent ? "text-destructive font-medium" : "text-primary font-medium"}>
          {formatRand(spent)} / {formatRand(allocated)}
        </span>
      </div>
    </div>
  );
}
