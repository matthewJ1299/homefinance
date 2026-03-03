import type { ExpenseWithDetails } from "@/lib/types";
import { formatRand } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

interface ExpenseItemProps {
  expense: ExpenseWithDetails;
  showOwner?: boolean;
  className?: string;
}

export function ExpenseItem({ expense, showOwner = false, className }: ExpenseItemProps) {
  const initial = expense.userName.slice(0, 1).toUpperCase();
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium"
          title={expense.userName}
        >
          {initial}
        </span>
        <div className="min-w-0">
          {showOwner && (
            <span className="text-xs text-muted-foreground block truncate">{expense.userName}</span>
          )}
          <span className="font-medium text-sm block truncate">{expense.categoryName}</span>
          {expense.note && (
            <span className="text-xs text-muted-foreground truncate block">{expense.note}</span>
          )}
        </div>
      </div>
      <span className="shrink-0 font-medium">{formatRand(expense.amount)}</span>
    </div>
  );
}
