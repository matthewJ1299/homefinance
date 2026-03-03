import { cn } from "@/lib/utils";

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
  if (totalIncome <= 0) return null;
  const allocatedPct = (allocated / totalIncome) * 100;
  const spentPct = allocated > 0 ? (spent / allocated) * 100 : 0;
  const isOverspent = spent > allocated;
  const isApproaching = !isOverspent && allocated > 0 && spent / allocated >= 0.8;
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full transition-all",
            isOverspent ? "bg-destructive" : isApproaching ? "bg-amber-500" : "bg-primary"
          )}
          style={{ width: `${Math.min(100, (spent / totalIncome) * 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Spent vs allocated</span>
        {allocated > 0 && (
          <span className={isOverspent ? "text-destructive font-medium" : ""}>
            {Math.round(spentPct)}% of allocation
          </span>
        )}
      </div>
    </div>
  );
}
