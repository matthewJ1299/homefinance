/**
 * Server-safe utilities for expenses view (URL param parsing).
 * No "use client" - safe to import and call from Server Components.
 */

export type ExpensesView = "me" | "combined" | number;

export function parseExpensesView(
  viewParam: string | undefined,
  currentUserId: number
): ExpensesView {
  if (!viewParam || viewParam === "me") return "me";
  if (viewParam === "combined") return "combined";
  const id = parseInt(viewParam, 10);
  if (Number.isNaN(id) || id < 1) return "me";
  return id;
}
