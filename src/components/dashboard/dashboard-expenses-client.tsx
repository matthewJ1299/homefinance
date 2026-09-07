"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import type { Category, ExpenseWithDetails, SplitGroup } from "@/lib/types";
import type { IncomeEntry } from "@/lib/repositories/interfaces/income.repository";
import type { CategoryBudgetHint } from "@/components/expenses/category-picker";
import { usePropSyncedState } from "@/hooks/use-prop-synced-state";
import { WhenDashboardTileEnabled } from "@/components/dashboard/when-dashboard-tile-enabled";
import { HomeQuickAddLauncher } from "@/components/dashboard/home-quick-add-launcher";
import { DashboardRecentTransactionsList } from "@/components/dashboard/dashboard-recent-transactions-list";
import { buildRecentMergedByDate } from "@/lib/utils/dashboard-recent-transactions";
import { formatRand } from "@/lib/utils/currency";

export function DashboardExpensesClient({
  userId,
  month,
  monthLabelPretty,
  categories,
  otherUserName,
  primaryAccountId,
  initialExpenses,
  incomeEntries,
  mergedTransactionsDisplayLimit,
}: {
  userId: number;
  month: string;
  monthLabelPretty: string;
  categories: Category[];
  otherUserName?: string;
  primaryAccountId?: number | null;
  initialExpenses: ExpenseWithDetails[];
  incomeEntries: IncomeEntry[];
  mergedTransactionsDisplayLimit: number;
}) {
  const [expensesState, setExpensesState] = usePropSyncedState(initialExpenses);

  const optimisticUpsertExpense = useCallback(
    (next: ExpenseWithDetails) => {
      const snapshot = expensesState;
      setExpensesState((prev) => {
        const idx = prev.findIndex((e) => e.id === next.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = next;
          return copy;
        }
        return [next, ...prev];
      });
      return () => setExpensesState(snapshot);
    },
    [expensesState, setExpensesState]
  );

  const optimisticRemoveExpense = useCallback(
    (expense: ExpenseWithDetails) => {
      const snapshot = expensesState;
      setExpensesState((prev) => prev.filter((e) => e.id !== expense.id));
      return () => setExpensesState(snapshot);
    },
    [expensesState, setExpensesState]
  );

  const merged = useMemo(
    () =>
      buildRecentMergedByDate(
        expensesState,
        incomeEntries,
        primaryAccountId,
        mergedTransactionsDisplayLimit
      ),
    [expensesState, incomeEntries, primaryAccountId, mergedTransactionsDisplayLimit]
  );

  return (
    <>
      <WhenDashboardTileEnabled tile="quickAdd">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-tight">Quick add expense</h2>
            <span className="text-xs text-muted-foreground">{monthLabelPretty}</span>
          </div>
          <HomeQuickAddLauncher />
        </div>
      </WhenDashboardTileEnabled>

      <WhenDashboardTileEnabled tile="transactions">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-tight">Recent transactions</h2>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
                <span>In {formatRand(merged.incomeSumMinor)}</span>
                <span className="text-border">|</span>
                <span>Out {formatRand(merged.expenseSumMinor)}</span>
              </div>
              <Link
                href={`/expenses?month=${encodeURIComponent(month)}`}
                className="text-xs font-medium text-primary hover:underline cursor-pointer"
              >
                View more
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/90 p-3 shadow-sm">
            <DashboardRecentTransactionsList
              byDate={merged.byDate}
              dates={merged.dates}
              categories={categories}
              otherUserName={otherUserName}
              onOptimisticRemoveExpense={optimisticRemoveExpense}
              onOptimisticUpsertExpense={optimisticUpsertExpense}
            />
          </div>
        </section>
      </WhenDashboardTileEnabled>
    </>
  );
}

