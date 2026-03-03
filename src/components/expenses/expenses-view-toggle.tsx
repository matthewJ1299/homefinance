"use client";

import type { UserSummary } from "@/lib/repositories/interfaces/user.repository";
import { parseExpensesView as parseExpensesViewUtil, type ExpensesView } from "@/lib/utils/expenses-view";

export type { ExpensesView };

interface ExpensesViewToggleProps {
  currentView: ExpensesView;
  currentUserId: number;
  users: UserSummary[];
  onViewChange: (view: ExpensesView) => void;
  className?: string;
}

export function ExpensesViewToggle({
  currentView,
  currentUserId,
  users,
  onViewChange,
  className = "",
}: ExpensesViewToggleProps) {
  const isActive = (v: ExpensesView) => {
    if (typeof currentView === "number" && typeof v === "number") return currentView === v;
    return currentView === v;
  };

  return (
    <nav
      className={`flex flex-wrap gap-1 border rounded-lg p-1 bg-muted/50 ${className}`}
      aria-label="Filter by user"
    >
      <button
        type="button"
        onClick={() => onViewChange("me")}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          isActive("me") ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        My expenses
      </button>
      {users
        .filter((u) => u.id !== currentUserId)
        .map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => onViewChange(u.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isActive(u.id) ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {u.name}&apos;s expenses
          </button>
        ))}
      <button
        type="button"
        onClick={() => onViewChange("combined")}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          isActive("combined") ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Combined
      </button>
    </nav>
  );
}

export const parseExpensesView = parseExpensesViewUtil;

export function viewToUserId(view: ExpensesView, currentUserId: number): number | undefined {
  if (view === "combined") return undefined;
  if (view === "me") return currentUserId;
  return view;
}
