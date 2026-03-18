"use client";

import { useState, useMemo, useEffect } from "react";
import type { ExpenseWithDetails, AccountType } from "@/lib/types";
import type { IncomeEntry } from "@/lib/repositories/interfaces/income.repository";
import type { Category, SplitGroup } from "@/lib/types";
import type { UserSummary } from "@/lib/repositories/interfaces/user.repository";
import { ExpensesViewToggle, viewToUserId, type ExpensesView } from "./expenses-view-toggle";
import { ExpenseList } from "./expense-list";
import { QuickAddForm } from "./quick-add-form";
import { formatRand } from "@/lib/utils/currency";

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
  const [accounts, setAccounts] = useState<
    Array<{ id: number; name: string; type: AccountType }>
  >([]);

  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => (res.ok ? res.json() : { accounts: [] }))
      .then((data) => setAccounts(data.accounts ?? []));
  }, []);

  function filterByAccount<T extends { accountId?: number | null }>(
    items: T[],
    selectedAccountId: number | null
  ): T[] {
    if (!selectedAccountId) return items;
    return items.filter((e) => e.accountId === selectedAccountId);
  }

  const filteredExpenses = useMemo(
    () =>
      filterByAccount(
        filterByView(expenses, view, currentUserId),
        accountId
      ),
    [expenses, view, currentUserId, accountId]
  );
  const filteredIncome = useMemo(
    () => filterByView(incomeEntries, view, currentUserId),
    [incomeEntries, view, currentUserId]
  );
  const expenseTotal = useMemo(() => sumAmount(filteredExpenses), [filteredExpenses]);
  const incomeTotal = useMemo(() => sumAmount(filteredIncome), [filteredIncome]);
  const balance = incomeTotal - expenseTotal;

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
        <QuickAddForm categories={categories} userId={currentUserId} splitGroups={splitGroups} />
      </section>
      <ExpenseList
        expenses={filteredExpenses}
        showOwner={view === "combined"}
        categories={categories}
        otherUserName={users.find((u) => u.id !== currentUserId)?.name}
      />
    </div>
  );
}
