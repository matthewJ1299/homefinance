import type { BudgetAnalysisReport, StoredBudgetAiReport } from "@/lib/types/budget-ai-report";

export const BUDGET_AI_REPORT_SESSION_KEY = "homefinance.budgetAiReport.v1";

function isBudgetAnalysisReport(value: unknown): value is BudgetAnalysisReport {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  if (typeof r.summary !== "string") return false;
  if (!Array.isArray(r.top_issues) || !r.top_issues.every((x) => typeof x === "string")) return false;
  if (!Array.isArray(r.next_month_plan) || !r.next_month_plan.every((x) => typeof x === "string")) return false;
  if (!Array.isArray(r.data_issues) || !r.data_issues.every((x) => typeof x === "string")) return false;
  return true;
}

export function saveBudgetAiReportSession(payload: StoredBudgetAiReport): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(BUDGET_AI_REPORT_SESSION_KEY, JSON.stringify(payload));
  } catch {
    // quota / private mode
  }
}

export function loadBudgetAiReportSession(expectedMonth: string | null): StoredBudgetAiReport | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(BUDGET_AI_REPORT_SESSION_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as StoredBudgetAiReport;
    if (!data?.month || !data?.report) return null;
    if (expectedMonth && data.month !== expectedMonth) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearBudgetAiReportSession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(BUDGET_AI_REPORT_SESSION_KEY);
}

/** Client-only: validate minimal shape after JSON.parse from session. */
export function isStoredBudgetAiReport(value: unknown): value is StoredBudgetAiReport {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.month !== "string" || typeof v.rawModelText !== "string" || typeof v.inputDebugText !== "string")
    return false;
  return isBudgetAnalysisReport(v.report);
}
