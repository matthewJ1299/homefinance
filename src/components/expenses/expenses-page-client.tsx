"use client";

import { useState, useMemo } from "react";
import type { ExpenseWithDetails } from "@/lib/types";
import type { IncomeEntry } from "@/lib/repositories/interfaces/income.repository";
import type { Category } from "@/lib/types";
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
  expenses,
  incomeEntries,
  initialView,
}: ExpensesPageClientProps) {
  const [view, setView] = useState<ExpensesView>(initialView);

  const filteredExpenses = useMemo(
    () => filterByView(expenses, view, currentUserId),
    [expenses, view, currentUserId]
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
        <div className="flex flex-wrap gap-4 text-sm">
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
        </div>
      </div>
      <section>
        <h2 className="sr-only">Add expense</h2>
        <QuickAddForm categories={categories} userId={currentUserId} />
      </section>
      <ExpenseList expenses={filteredExpenses} showOwner={view === "combined"} />
    </div>
  );
}
