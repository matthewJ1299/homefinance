import type { IncomeEntry } from "@/lib/repositories/interfaces/income.repository";
import { formatRand } from "@/lib/utils/currency";
import { format } from "date-fns";

interface IncomeListProps {
  entries: IncomeEntry[];
  onDelete?: (id: number) => void;
  className?: string;
}

export function IncomeList({ entries, className }: IncomeListProps) {
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-6 text-center" role="status">
        No income this month.
      </p>
    );
  }

  return (
    <ul className={`divide-y divide-border ${className ?? ""}`}>
      {entries.map((entry) => (
        <li key={entry.id} className="py-3 flex items-center justify-between gap-4">
          <div>
            <span className="font-medium capitalize">{entry.type.replace("_", " ")}</span>
            {entry.description && (
              <span className="text-sm text-muted-foreground block">{entry.description}</span>
            )}
            <span className="text-xs text-muted-foreground">
              {entry.userName} - {format(new Date(entry.date + "T12:00:00"), "d MMM")}
            </span>
          </div>
          <span className="font-medium">{formatRand(entry.amount)}</span>
        </li>
      ))}
    </ul>
  );
}
