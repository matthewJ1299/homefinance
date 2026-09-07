"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAddSheet } from "@/components/add/add-sheet-context";
import { createReconRule } from "@/lib/actions/recon-rule.actions";
import { formatRand } from "@/lib/utils/currency";

export interface DecisionRow {
  itemId: number;
  vendor: string;
  merchantKey: string;
  amountMinor: number;
  txnDate: string;
  suggestedCategoryId: number | null;
  suggestedCategoryName: string | null;
}

/**
 * "Do this every time." Its own component so it can hold the toggle state --
 * the sheet takes `extraControl` as a node, so anything stateful has to own
 * its state and report upward.
 */
function RepeatToggle({ onChange }: { onChange: (on: boolean) => void }) {
  const [on, setOn] = useState(false);
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm">
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => {
          setOn(e.target.checked);
          onChange(e.target.checked);
        }}
        className="h-4 w-4 cursor-pointer accent-primary"
      />
      <span>Do this every time</span>
    </label>
  );
}

/**
 * The rows a rule could not place. This is the decision surface -- what used to
 * be a parser table with a category dropdown and a "split?" checkbox that meant
 * "everyone in the house, evenly".
 *
 * Each row opens the Add sheet, so the category pills, the participant picker
 * and the consequence panel are the same ones every other spend goes through.
 */
export function ReconDecisionList({ rows }: { rows: DecisionRow[] }) {
  const addSheet = useAddSheet();
  const router = useRouter();
  // Read inside `onSubmit`, which is created once per open.
  const repeatRef = useRef(false);

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Nothing needs you"
        message="Everything from your bank has been placed."
      />
    );
  }

  function openRow(row: DecisionRow) {
    if (!addSheet) return;
    repeatRef.current = false;
    addSheet.open({
      title: row.vendor,
      submitLabel: "File it",
      // The parsers get the amount wrong often enough that it stays editable.
      amountMinor: row.amountMinor,
      date: row.txnDate,
      categoryId: row.suggestedCategoryId ?? undefined,
      note: `Recon: ${row.vendor}`,
      extraControl: <RepeatToggle onChange={(on) => (repeatRef.current = on)} />,
      onSubmit: async (values) => {
        const res = await fetch(`/api/recon/items/${row.itemId}/accept-add`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryId: values.categoryId,
            accountId: values.accountId ?? null,
            amount: values.amountMinor,
            note: values.note ?? undefined,
            entryKind: "expense",
            // The shares the sheet solved, not a boolean.
            split: values.participants.length > 1 ? values.participants : undefined,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          return { ok: false as const, error: body?.error ?? "Could not file it" };
        }
        if (repeatRef.current) {
          const made = await createReconRule({
            matchKind: "merchant_exact",
            matchValue: row.merchantKey || row.vendor,
            categoryId: values.categoryId,
            participantUserIds: values.participants.map((p) => p.userId),
          });
          // The spend is already filed; a failed rule is worth saying but not
          // worth failing the save over.
          if (!made.success) toast.error(`Filed, but the rule was not saved: ${made.error}`);
        }
        return { ok: true as const };
      },
      onSaved: () => router.refresh(),
    });
  }

  return (
    <Card className="rounded-2xl px-3.5 py-0">
      {rows.map((row) => (
        <button
          key={row.itemId}
          type="button"
          onClick={() => openRow(row)}
          disabled={!addSheet}
          className="flex w-full items-baseline justify-between gap-3 border-b border-border/50 py-3.5 text-left last:border-0 cursor-pointer disabled:cursor-not-allowed"
        >
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-medium">{row.vendor}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {row.txnDate}
              {row.suggestedCategoryName ? ` · maybe ${row.suggestedCategoryName}` : ""}
            </span>
          </span>
          <span className="shrink-0 text-base font-semibold tabular-nums">
            {formatRand(row.amountMinor)}
          </span>
        </button>
      ))}
    </Card>
  );
}
