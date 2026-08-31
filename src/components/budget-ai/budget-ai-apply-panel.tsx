"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyBudgetAiSuggestions } from "@/lib/actions/budget-ai-report.actions";
import type { BudgetAnalysisReport } from "@/lib/types/budget-ai-report";
import { formatRand } from "@/lib/utils/currency";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export interface BudgetCategoryOverviewItem {
  categoryId: number;
  categoryName: string;
  allocated: number;
  remaining: number;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function resolveCategorySync(
  categoryName: string,
  categories: BudgetCategoryOverviewItem[]
): BudgetCategoryOverviewItem | null {
  const n = normalizeName(categoryName);
  return categories.find((c) => normalizeName(c.categoryName) === n) ?? null;
}

interface SelectableRow {
  kind: "allocation" | "move";
  index: number;
  label: string;
  detail: string;
  disabled: boolean;
  disabledReason?: string;
}

interface BudgetAiApplyPanelProps {
  runId: number;
  report: BudgetAnalysisReport;
  categories: BudgetCategoryOverviewItem[];
  enabled: boolean;
}

export function BudgetAiApplyPanel({ runId, report, categories, enabled }: BudgetAiApplyPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [appliedKeys, setAppliedKeys] = useState<Set<string>>(new Set());

  const rows = useMemo((): SelectableRow[] => {
    const out: SelectableRow[] = [];
    const allocationChanges = report.allocation_changes ?? [];
    for (let i = 0; i < allocationChanges.length; i++) {
      const a = allocationChanges[i];
      const cat = resolveCategorySync(a.category_name, categories);
      const current = cat?.allocated ?? null;
      const disabled = !cat;
      out.push({
        kind: "allocation",
        index: i,
        label: a.category_name,
        detail:
          current != null
            ? `${formatRand(current)} → ${formatRand(a.new_allocated_cents)}`
            : formatRand(a.new_allocated_cents),
        disabled,
        disabledReason: disabled ? "Category not found in your budget" : undefined,
      });
    }
    for (let i = 0; i < report.recommended_moves.length; i++) {
      const m = report.recommended_moves[i];
      const from = resolveCategorySync(m.from_category, categories);
      const to = resolveCategorySync(m.to_category, categories);
      let disabled = !from || !to;
      let disabledReason: string | undefined;
      if (!from) disabledReason = `From category not found: ${m.from_category}`;
      else if (!to) disabledReason = `To category not found: ${m.to_category}`;
      else if (from.remaining < m.amount_cents) {
        disabled = true;
        disabledReason = `Insufficient remaining in ${from.categoryName}`;
      }
      out.push({
        kind: "move",
        index: i,
        label: `${m.from_category} → ${m.to_category}`,
        detail: formatRand(m.amount_cents),
        disabled,
        disabledReason,
      });
    }
    return out;
  }, [report, categories]);

  if (rows.length === 0) return null;

  const keyFor = (r: SelectableRow) => `${r.kind}-${r.index}`;

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedRows = rows.filter((r) => selected.has(keyFor(r)) && !r.disabled);

  const confirmLines = selectedRows.map((r) => {
    if (r.kind === "allocation") {
      const a = report.allocation_changes[r.index];
      const cat = resolveCategorySync(a.category_name, categories);
      return `${a.category_name}: ${cat ? formatRand(cat.allocated) : "?"} → ${formatRand(a.new_allocated_cents)}`;
    }
    const m = report.recommended_moves[r.index];
    return `Transfer ${formatRand(m.amount_cents)} from ${m.from_category} to ${m.to_category}`;
  });

  const handleApply = () => {
    const moveIndexes: number[] = [];
    const allocationIndexes: number[] = [];
    for (const r of selectedRows) {
      if (r.kind === "move") moveIndexes.push(r.index);
      else allocationIndexes.push(r.index);
    }
    startTransition(async () => {
      const result = await applyBudgetAiSuggestions(runId, { moveIndexes, allocationIndexes });
      if (result.success) {
        setConfirmOpen(false);
        setSelected(new Set());
        setAppliedKeys((prev) => {
          const next = new Set(prev);
          for (const r of selectedRows) next.add(keyFor(r));
          return next;
        });
        const errNote =
          result.errors.length > 0 ? ` (${result.errors.length} skipped with warnings)` : "";
        toast.success(`Applied ${result.appliedCount} change(s) to your budget${errNote}`);
        if (result.errors.length > 0) {
          result.errors.forEach((e) => toast.message(e));
        }
        router.refresh();
      } else {
        toast.error(result.error);
        if (result.errors?.length) {
          result.errors.forEach((e) => toast.message(e));
        }
      }
    });
  };

  if (!enabled) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Apply suggestions to budget</CardTitle>
        <p className="text-sm text-muted-foreground font-normal">
          Select changes to write to this month&apos;s budget. You will confirm before anything is saved.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r) => {
          const key = keyFor(r);
          const isApplied = appliedKeys.has(key);
          return (
            <label
              key={key}
              className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm ${
                r.disabled || isApplied ? "cursor-not-allowed opacity-60" : "border-border/80"
              }`}
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={selected.has(key)}
                disabled={r.disabled || isApplied || isPending}
                onChange={() => toggle(key)}
              />
              <span className="min-w-0 flex-1">
                <span className="font-medium text-card-foreground">{r.label}</span>
                <span className="mt-0.5 block text-muted-foreground">{r.detail}</span>
                {r.disabledReason ? (
                  <span className="mt-1 block text-xs text-amber-600 dark:text-amber-400">{r.disabledReason}</span>
                ) : null}
                {isApplied ? (
                  <span className="mt-1 block text-xs text-emerald-600 dark:text-emerald-400">Applied this session</span>
                ) : null}
              </span>
            </label>
          );
        })}
        <Button
          type="button"
          disabled={selectedRows.length === 0 || isPending}
          onClick={() => setConfirmOpen(true)}
        >
          Apply selected ({selectedRows.length})
        </Button>
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogHeader>Confirm budget changes</DialogHeader>
        <p className="text-sm text-muted-foreground">
          These updates will be written to your live budget for this report month. This cannot be undone automatically,
          but each change is recorded in the apply history.
        </p>
        <ul className="mt-3 max-h-48 list-inside list-disc space-y-1 overflow-auto text-sm">
          {confirmLines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleApply} disabled={isPending}>
            {isPending ? "Applying…" : "Confirm apply"}
          </Button>
        </DialogFooter>
      </Dialog>
    </Card>
  );
}
