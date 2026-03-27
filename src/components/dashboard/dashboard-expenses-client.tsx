"use client";

import { useCallback } from "react";
import type { Category, ExpenseWithDetails, SplitGroup } from "@/lib/types";
import type { CategoryBudgetHint } from "@/components/expenses/category-picker";
import { usePropSyncedState } from "@/hooks/use-prop-synced-state";
import { WhenDashboardTileEnabled } from "@/components/dashboard/when-dashboard-tile-enabled";
import { HomeInlineQuickAddExpense } from "@/components/dashboard/home-inline-quick-add";
import { ExpenseList } from "@/components/expenses/expense-list";
import { formatRand } from "@/lib/utils/currency";

export function DashboardExpensesClient({
  userId,
  userName,
  month,
  monthLabelPretty,
  categories,
  splitGroups,
  otherUserName,
  budgetByCategory,
  primaryAccountId,
  expenseDate,
  initialExpenses,
}: {
  userId: number;
  userName: string;
  month: string;
  monthLabelPretty: string;
  categories: Category[];
  splitGroups: SplitGroup[];
  otherUserName?: string;
  budgetByCategory?: Map<number, CategoryBudgetHint>;
  primaryAccountId?: number | null;
  expenseDate: string;
  initialExpenses: ExpenseWithDetails[];
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

  const optimisticReplaceExpenseId = useCallback(
    (tempId: number, realId: number) => {
      setExpensesState((prev) =>
        prev.map((e) => (e.id === tempId ? { ...e, id: realId } : e))
      );
    },
    [setExpensesState]
  );

  const optimisticRemoveExpense = useCallback(
    (expense: ExpenseWithDetails) => {
      const snapshot = expensesState;
      setExpensesState((prev) => prev.filter((e) => e.id !== expense.id));
      return () => setExpensesState(snapshot);
    },
    [expensesState, setExpensesState]
  );

  const effectiveRecentExpenses = primaryAccountId
    ? expensesState.filter((e) => e.accountId != null && Number(e.accountId) === primaryAccountId)
    : expensesState;

  const balanceCents = effectiveRecentExpenses.reduce((s, e) => s + e.amount, 0);

  return (
    <>
      <WhenDashboardTileEnabled tile="quickAdd">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-tight">Quick add expense</h2>
            <span className="text-xs text-muted-foreground">{monthLabelPretty}</span>
          </div>
          <HomeInlineQuickAddExpense
            userId={userId}
            userName={userName}
            month={month}
            categories={categories}
            splitGroups={splitGroups}
            otherUserName={otherUserName}
            budgetByCategory={budgetByCategory}
            primaryAccountId={primaryAccountId}
            expenseDate={expenseDate}
            onOptimisticUpsertExpense={optimisticUpsertExpense}
            onOptimisticReplaceExpenseId={optimisticReplaceExpenseId}
          />
        </div>
      </WhenDashboardTileEnabled>

      <WhenDashboardTileEnabled tile="recentExpenses">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-tight">Recent expenses</h2>
            <span className="text-xs text-muted-foreground">{formatRand(balanceCents)}</span>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/90 p-3 shadow-sm">
            <ExpenseList
              expenses={effectiveRecentExpenses}
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

