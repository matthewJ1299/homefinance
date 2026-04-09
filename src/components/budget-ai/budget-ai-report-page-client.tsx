"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BudgetAiReportView } from "@/components/budget-ai/budget-ai-report-view";
import { AiAnalysisButton } from "@/components/dashboard/ai-analysis-button";
import { MonthNavigator } from "@/components/layout/month-navigator";
import { cn } from "@/lib/utils";
import type { AIAnalysisRunDetailRow, AIAnalysisRunSummaryRow } from "@/lib/repositories/interfaces/ai-analysis-run.repository";
import { formatBudgetMonthLabel } from "@/lib/utils/date";
import { useBudgetMonthStartDay } from "@/components/settings/budget-month-start-context";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useMonthNavigation } from "@/hooks/use-month-navigation";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

function getProviderLabelFromInputText(inputText: unknown): string | null {
  if (typeof inputText !== "string" || !inputText.trim()) return null;
  const line = inputText.split("\n", 1)[0]?.trim() ?? "";
  if (!line.startsWith("AI_PROVIDER:")) return null;
  const value = line.slice("AI_PROVIDER:".length).trim();
  return value || null;
}

function formatMonthHeading(month: string, startDay: number): string {
  try {
    return formatBudgetMonthLabel(month, startDay);
  } catch {
    return month;
  }
}

export function BudgetAiReportPageClient({
  enabled,
  monthParam,
  runs,
  selectedRun,
}: {
  enabled: boolean;
  monthParam: string;
  runs: AIAnalysisRunSummaryRow[];
  selectedRun: AIAnalysisRunDetailRow | null;
}) {
  const startDay = useBudgetMonthStartDay();
  const router = useRouter();
  const { month } = useMonthNavigation();
  const [rawOpen, setRawOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const selected = selectedRun;
  const providerLabel = useMemo(() => getProviderLabelFromInputText(selected?.inputText), [selected?.inputText]);

  const options = useMemo(() => {
    return runs.map((r) => {
      const when = (() => {
        try {
          return format(new Date(r.createdAt), "yyyy-MM-dd HH:mm");
        } catch {
          return r.createdAt;
        }
      })();
      return { id: r.id, label: `${r.month} — ${when}` };
    });
  }, [runs]);

  const selectedId = selected?.id ?? (options[0]?.id ?? "");

  const handleSelectRun = (idStr: string) => {
    const id = Number(idStr);
    if (!id) return;
    const match = runs.find((r) => r.id === id);
    const params = new URLSearchParams();
    params.set("month", match?.month ?? monthParam);
    params.set("runId", String(id));
    router.push(`/budget-ai-report?${params.toString()}`);
  };

  if (!selected) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold">Budget AI report</h1>
          <MonthNavigator />
        </div>
        <AiAnalysisButton month={month} enabled={enabled} />
        <p className="text-sm text-muted-foreground">
          No saved report found for this month ({monthParam}). Run <strong>Analyze spending</strong> to generate the first
          one; it will be saved and shown here.
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
            {formatMonthHeading(selected.month, startDay)} ({selected.month})
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard?month=${encodeURIComponent(selected.month)}`}
            className={cn(
              "inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
            )}
          >
            Dashboard
          </Link>
          <Link
            href={`/summary?month=${encodeURIComponent(selected.month)}`}
            className={cn(
              "inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
            )}
          >
            Summary
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium">Saved reports</p>
          <select
            className="h-10 w-full min-w-[280px] rounded-md border border-input bg-background px-3 text-sm"
            value={String(selectedId)}
            onChange={(e) => handleSelectRun(e.target.value)}
          >
            {options.map((o) => (
              <option key={o.id} value={String(o.id)}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between gap-3">
          <MonthNavigator />
          <AiAnalysisButton month={month} enabled={enabled} />
        </div>
      </div>

      <div className="rounded-lg border bg-card p-3">
        <p className="text-sm font-medium">AI provider used</p>
        <p className="text-sm text-muted-foreground mt-1">{providerLabel ?? "Unknown (older report / not recorded)"}</p>
      </div>
      <BudgetAiReportView report={selected.outputJson as any} />

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
            {selected.outputText}
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
            {selected.inputText}
          </pre>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">Reports are loaded from the database (newest shown by default).</p>
    </div>
  );
}
