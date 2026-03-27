import type { ExpenseWithDetails } from "@/lib/types";
import type { Category } from "@/lib/types";
import { ExpenseItem } from "./expense-item";
import { format } from "date-fns";

interface ExpenseListProps {
  expenses: ExpenseWithDetails[];
  showOwner?: boolean;
  categories?: Category[];
  otherUserName?: string;
  className?: string;
  onOptimisticRemoveExpense?: (expense: ExpenseWithDetails) => () => void;
  onOptimisticUpsertExpense?: (next: ExpenseWithDetails) => () => void;
}

export function ExpenseList({
  expenses,
  showOwner = false,
  categories = [],
  otherUserName,
  className,
  onOptimisticRemoveExpense,
  onOptimisticUpsertExpense,
}: ExpenseListProps) {
  const byDate = expenses.reduce<Record<string, ExpenseWithDetails[]>>((acc, e) => {
    (acc[e.date] ??= []).push(e);
    return acc;
  }, {});
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  if (dates.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-6 text-center" role="status">
        No expenses this month.
      </p>
    );
  }

  return (
    <div className={className ?? ""}>
      {dates.map((date) => (
        <div key={date} className="mb-4">
          <h3 className="text-xs font-medium text-muted-foreground mb-2">
            {format(new Date(date + "T12:00:00"), "EEEE, d MMMM")}
          </h3>
          <div className="space-y-0">
            {byDate[date].map((expense) => (
              <ExpenseItem
                key={expense.id}
                expense={expense}
                showOwner={showOwner}
                categories={categories}
                otherUserName={otherUserName}
                onOptimisticRemoveExpense={onOptimisticRemoveExpense}
                onOptimisticUpsertExpense={onOptimisticUpsertExpense}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
