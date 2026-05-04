"use client";

import { format } from "date-fns";
import type { Category, ExpenseWithDetails } from "@/lib/types";
import type { MergedDayRow } from "@/lib/utils/dashboard-recent-transactions";
import { ExpenseItem } from "@/components/expenses/expense-item";
import { formatRand } from "@/lib/utils/currency";

interface DashboardRecentTransactionsListProps {
  byDate: Record<string, MergedDayRow[]>;
  dates: string[];
  categories: Category[];
  otherUserName?: string;
  onOptimisticRemoveExpense?: (expense: ExpenseWithDetails) => () => void;
  onOptimisticUpsertExpense?: (next: ExpenseWithDetails) => () => void;
}

export function DashboardRecentTransactionsList({
  byDate,
  dates,
  categories,
  otherUserName,
  onOptimisticRemoveExpense,
  onOptimisticUpsertExpense,
}: DashboardRecentTransactionsListProps) {
  if (dates.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-6 text-center" role="status">
        No transactions this month.
      </p>
    );
  }

  return (
    <div>
      {dates.map((date) => (
        <div key={date} className="mb-4 last:mb-0">
          <h3 className="text-xs font-medium text-muted-foreground mb-2">
            {format(new Date(date + "T12:00:00"), "EEEE, d MMMM")}
          </h3>
          <div className="space-y-0">
            {(byDate[date] ?? []).map((row) =>
              row.kind === "expense" ? (
                <ExpenseItem
                  key={`e-${row.expense.id}`}
                  expense={row.expense}
                  categories={categories}
                  otherUserName={otherUserName}
                  onOptimisticRemoveExpense={onOptimisticRemoveExpense}
                  onOptimisticUpsertExpense={onOptimisticUpsertExpense}
                />
              ) : (
                <div
                  key={`i-${row.income.id}`}
                  className="py-3 flex items-center justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">Income</span>
                    {row.income.description ? (
                      <span className="text-muted-foreground block truncate">{row.income.description}</span>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {row.income.userName} - {row.income.type.replace("_", " ")}
                    </span>
                  </div>
                  <span className="font-medium tabular-nums shrink-0">{formatRand(row.income.amount)}</span>
                </div>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
