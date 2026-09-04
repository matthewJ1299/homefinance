"use client";

import { useState, useMemo, useEffect, useCallback, useId } from "react";
import type { ExpenseWithDetails, AccountType } from "@/lib/types";
import type { IncomeEntry } from "@/lib/repositories/interfaces/income.repository";
import type { Category, SplitGroup } from "@/lib/types";
import type { UserSummary } from "@/lib/repositories/interfaces/user.repository";
import { INCOME_KINDS, type IncomeKind } from "@/lib/types/income-type";
import { ExpenseList } from "./expense-list";
import { QuickAddForm } from "./quick-add-form";
import { formatRand, fromMinorUnits } from "@/lib/utils/currency";
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
  /** Preselects the income filter, so /income can redirect here. */
  initialType?: "all" | "expense" | "income";
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
  initialType = "all",
}: ExpensesPageClientProps) {
  const searchFieldId = useId();
  // The my/theirs/combined toggle is gone: you see your own rows plus rows on
  // shared accounts, which is the honest answer to "whose money is this?".
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [incomeKind, setIncomeKind] = useState<IncomeKind | "all">("all");
  const [accountId, setAccountId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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
    if (typeFilter === "income") return [];
    const byAccount = filterByAccount(expensesState, accountId);
    return filterByCategory(byAccount, categoryId);
  }, [expensesState, typeFilter, accountId, categoryId]);

  const searchFilteredExpenses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filteredExpenses;
    return filteredExpenses.filter((e) => {
      const hay = [
        e.note,
        e.categoryName,
        e.userName,
        e.date,
        String(fromMinorUnits(e.amount)),
        String(e.amount),
      ]
        .map((x) => String(x ?? "").toLowerCase())
        .join(" ");
      return hay.includes(q);
    });
  }, [filteredExpenses, searchQuery]);
  const filteredIncome = useMemo(() => {
    if (typeFilter === "expense") return [];
    if (incomeKind === "all") return incomeEntries;
    return incomeEntries.filter((i) => i.incomeKind === incomeKind);
  }, [incomeEntries, typeFilter, incomeKind]);
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
        <h1 className="text-xl font-semibold">Transactions</h1>
        <div className="flex flex-col gap-1.5 sm:max-w-md">
          <label htmlFor={searchFieldId} className="text-xs font-medium text-muted-foreground">
            Search
          </label>
          <input
            id={searchFieldId}
            type="search"
            enterKeyHint="search"
            placeholder="Note, category, person, date, amount…"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "expense", "income"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              aria-pressed={typeFilter === t}
              className={`min-h-11 rounded-full border px-3.5 text-sm font-medium cursor-pointer ${
                typeFilter === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted text-foreground"
              }`}
            >
              {t === "all" ? "Everything" : t === "expense" ? "Money out" : "Money in"}
            </button>
          ))}
          {typeFilter === "income" ? (
            <select
              value={incomeKind}
              onChange={(ev) => setIncomeKind(ev.target.value as IncomeKind | "all")}
              aria-label="Income type"
              className="min-h-11 rounded-full border border-border bg-muted px-3 text-sm cursor-pointer"
            >
              <option value="all">All types</option>
              {INCOME_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          ) : null}
        </div>
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
        expenses={searchFilteredExpenses}
        showOwner
        categories={categories}
        otherUserName={users.find((u) => u.id !== currentUserId)?.name}
        onOptimisticRemoveExpense={optimisticRemoveExpense}
        onOptimisticUpsertExpense={optimisticUpsertExpense}
      />
    </div>
  );
}
