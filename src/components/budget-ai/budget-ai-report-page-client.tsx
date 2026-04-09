"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BudgetAiReportView } from "@/components/budget-ai/budget-ai-report-view";
import { cn } from "@/lib/utils";
import { BUDGET_AI_REPORT_SESSION_KEY, loadBudgetAiReportSession } from "@/lib/utils/budget-ai-report-session";
import type { StoredBudgetAiReport } from "@/lib/types/budget-ai-report";
import { formatBudgetMonthLabel } from "@/lib/utils/date";
import { useBudgetMonthStartDay } from "@/components/settings/budget-month-start-context";
import { ChevronDown, ChevronUp } from "lucide-react";

function formatMonthHeading(month: string, startDay: number): string {
  try {
    return formatBudgetMonthLabel(month, startDay);
  } catch {
    return month;
  }
}

export function BudgetAiReportPageClient({ monthParam }: { monthParam: string | null }) {
  const startDay = useBudgetMonthStartDay();
  const [stored, setStored] = useState<StoredBudgetAiReport | null>(null);
  const [rawOpen, setRawOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);

  useEffect(() => {
    const data = loadBudgetAiReportSession(monthParam);
    setStored(data);
  }, [monthParam]);

  if (!stored) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <h1 className="text-xl font-semibold">Budget AI report</h1>
        <p className="text-sm text-muted-foreground">
          No report found for this session
          {monthParam ? ` (${monthParam})` : ""}. Run <strong>Analyze spending</strong> from the dashboard or summary
          page for a month; you will be redirected here when the analysis completes.
        </p>
        <Link
          href="/dashboard"
          className={cn(
            "inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
          )}
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 pb-16">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Budget AI report</h1>
          <p className="text-sm text-muted-foreground">
            {formatMonthHeading(stored.month, startDay)} ({stored.month})
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard?month=${encodeURIComponent(stored.month)}`}
            className={cn(
              "inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
            )}
          >
            Dashboard
          </Link>
          <Link
            href={`/summary?month=${encodeURIComponent(stored.month)}`}
            className={cn(
              "inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
            )}
          >
            Summary
          </Link>
        </div>
      </div>

      <BudgetAiReportView report={stored.report} />

      <div className="rounded-lg border border-border bg-card">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium"
          onClick={() => setRawOpen(!rawOpen)}
        >
          Raw model JSON
          {rawOpen ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
        </button>
        {rawOpen ? (
          <pre className="max-h-64 overflow-auto border-t border-border p-3 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {stored.rawModelText}
          </pre>
        ) : null}
      </div>

      <div className="rounded-lg border border-border bg-card">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium"
          onClick={() => setDebugOpen(!debugOpen)}
        >
          Full prompt (debug)
          {debugOpen ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
        </button>
        {debugOpen ? (
          <pre className="max-h-96 overflow-auto border-t border-border p-3 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {stored.inputDebugText}
          </pre>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        This page reads the latest report from browser session storage ({BUDGET_AI_REPORT_SESSION_KEY}). Opening in a new
        tab or another browser will not show it until you run the analysis again.
      </p>
    </div>
  );
}
