"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import type { ExpenseWithDetails, AccountType } from "@/lib/types";
import type { IncomeEntry } from "@/lib/repositories/interfaces/income.repository";
import type { Category, SplitGroup } from "@/lib/types";
import type { UserSummary } from "@/lib/repositories/interfaces/user.repository";
import { ExpensesViewToggle, viewToUserId, type ExpensesView } from "./expenses-view-toggle";
import { ExpenseList } from "./expense-list";
import { QuickAddForm } from "./quick-add-form";
import { formatRand } from "@/lib/utils/currency";
import { parseAccountsApiPayload } from "@/lib/utils/accounts-api";
import { usePropSyncedState } from "@/hooks/use-prop-synced-state";

interface ExpensesPageClientProps {
  month: string;
  currentUserId: number;
  users: UserSummary[];
  categories: Category[];
  splitGroups?: SplitGroup[];
  expenses: ExpenseWithDetails[];
  incomeEntries: IncomeEntry[];
  initialView: ExpensesView;
}

function filterByView<T extends { userId: number }>(
  items: T[],
  view: ExpensesView,
  currentUserId: number
): T[] {
  const userId = viewToUserId(view, currentUserId);
  if (userId == null) return items;
  return items.filter((e) => e.userId === userId);
}

function sumAmount(items: { amount: number }[]): number {
  return items.reduce((s, e) => s + e.amount, 0);
}

export function ExpensesPageClient({
  month,
  currentUserId,
  users,
  categories,
  splitGroups = [],
  expenses,
  incomeEntries,
  initialView,
}: ExpensesPageClientProps) {
  const [view, setView] = useState<ExpensesView>(initialView);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [expensesState, setExpensesState] = usePropSyncedState(expenses);
  const currentUserName = users.find((u) => u.id === currentUserId)?.name ?? "You";
  const [accounts, setAccounts] = useState<
    Array<{ id: number; name: string; type: AccountType }>
  >([]);

  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        const { accounts: list } = parseAccountsApiPayload(data);
        setAccounts(list);
      });
  }, []);

  function filterByAccount<T extends { accountId?: number | null }>(
    items: T[],
    selectedAccountId: number | null
  ): T[] {
    if (selectedAccountId == null || selectedAccountId === 0) return items;
    return items.filter(
      (e) => e.accountId != null && Number(e.accountId) === selectedAccountId
    );
  }

  function filterByCategory<T extends { categoryId: number }>(
    items: T[],
    selectedCategoryId: number | null
  ): T[] {
    if (selectedCategoryId == null || selectedCategoryId === 0) return items;
    return items.filter((e) => e.categoryId === selectedCategoryId);
  }

  const filteredExpenses = useMemo(() => {
    const byView = filterByView(expensesState, view, currentUserId);
    const byAccount = filterByAccount(byView, accountId);
    return filterByCategory(byAccount, categoryId);
  }, [expensesState, view, currentUserId, accountId, categoryId]);
  const filteredIncome = useMemo(
    () => filterByView(incomeEntries, view, currentUserId),
    [incomeEntries, view, currentUserId]
  );
  const expenseTotal = useMemo(() => sumAmount(filteredExpenses), [filteredExpenses]);
  const incomeTotal = useMemo(() => sumAmount(filteredIncome), [filteredIncome]);
  const balance = incomeTotal - expenseTotal;

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-semibold">Expenses</h1>
        <ExpensesViewToggle
          currentView={view}
          currentUserId={currentUserId}
          users={users}
          onViewChange={setView}
        />
        <div className="flex flex-wrap gap-4 text-sm items-center">
          <span>
            <span className="text-muted-foreground">Income: </span>
            <span className="font-medium">{formatRand(incomeTotal)}</span>
          </span>
          <span>
            <span className="text-muted-foreground">Expenses: </span>
            <span className="font-medium">{formatRand(expenseTotal)}</span>
          </span>
          <span>
            <span className="text-muted-foreground">Balance: </span>
            <span
              className={`font-medium ${balance >= 0 ? "text-foreground" : "text-destructive"}`}
            >
              {formatRand(balance)}
            </span>
          </span>
          {categories.length > 0 && (
            <span className="flex items-center gap-2">
              <span className="text-muted-foreground">Category:</span>
              <select
                className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                value={categoryId ?? ""}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">All</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </span>
          )}
          {accounts.length > 0 && (
            <span className="flex items-center gap-2">
              <span className="text-muted-foreground">Account:</span>
              <select
                className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                value={accountId ?? ""}
                onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">All</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.type})
                  </option>
                ))}
              </select>
            </span>
          )}
        </div>
      </div>
      <section>
        <h2 className="sr-only">Add expense</h2>
        <QuickAddForm
          categories={categories}
          userId={currentUserId}
          currentUserName={currentUserName}
          month={month}
          splitGroups={splitGroups}
          onOptimisticUpsertExpense={optimisticUpsertExpense}
          onOptimisticReplaceExpenseId={optimisticReplaceExpenseId}
        />
      </section>
      <ExpenseList
        expenses={filteredExpenses}
        showOwner={view === "combined"}
        categories={categories}
        otherUserName={users.find((u) => u.id !== currentUserId)?.name}
        onOptimisticRemoveExpense={optimisticRemoveExpense}
        onOptimisticUpsertExpense={optimisticUpsertExpense}
      />
    </div>
  );
}
