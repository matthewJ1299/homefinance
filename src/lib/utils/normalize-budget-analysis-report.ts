import type { BudgetAnalysisReport } from "@/lib/types/budget-ai-report";

/** Ensures optional v6 fields exist when loading stored JSON. */
export function normalizeBudgetAnalysisReport(value: unknown): BudgetAnalysisReport | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  if (typeof o.summary !== "string") return null;
  return {
    summary: o.summary,
    top_issues: Array.isArray(o.top_issues) ? o.top_issues.filter((x): x is string => typeof x === "string") : [],
    recommended_moves: Array.isArray(o.recommended_moves) ? (o.recommended_moves as BudgetAnalysisReport["recommended_moves"]) : [],
    allocation_changes: Array.isArray(o.allocation_changes)
      ? (o.allocation_changes as BudgetAnalysisReport["allocation_changes"])
      : [],
    recategorisations: Array.isArray(o.recategorisations)
      ? (o.recategorisations as BudgetAnalysisReport["recategorisations"])
      : [],
    new_categories: Array.isArray(o.new_categories)
      ? (o.new_categories as BudgetAnalysisReport["new_categories"])
      : [],
    next_month_plan: Array.isArray(o.next_month_plan)
      ? o.next_month_plan.filter((x): x is string => typeof x === "string")
      : [],
    data_issues: Array.isArray(o.data_issues) ? o.data_issues.filter((x): x is string => typeof x === "string") : [],
  };
}
