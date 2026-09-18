"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAddSheet } from "@/components/add/add-sheet-context";
import { ReconAmount } from "@/components/recon/recon-amount";
import {
  ReconMailDetailDialog,
  type ReconMailSource,
} from "@/components/recon/recon-mail-detail-dialog";
import { createReconRule } from "@/lib/actions/recon-rule.actions";
import { flowFromStoredAmount, magnitudeFromStoredAmount } from "@/lib/services/recon/recon-flow";
import { legacyTypeForKind } from "@/lib/types/income-type";

export interface DecisionRow {
  itemId: number;
  vendor: string;
  merchantKey: string;
  amountMinor: number;
  txnDate: string;
  suggestedCategoryId: number | null;
  suggestedCategoryName: string | null;
  graphMessageId: string;
  rawSubject: string | null;
  rawBodyPreview: string | null;
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
 * The rows a rule could not place. This is the decision surface.
 *
 * A tap opens the same fetched-mail dialog as the Description cell on the
 * pending table — you read the bank message first. File it from there, into
 * the Add sheet on the tab the sign implies (Out = spend, In = income).
 */
export function ReconDecisionList({ rows }: { rows: DecisionRow[] }) {
  const addSheet = useAddSheet();
  const router = useRouter();
  const repeatRef = useRef(false);
  const [mail, setMail] = useState<DecisionRow | null>(null);

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Nothing needs you"
        message="Everything from your bank has been placed."
      />
    );
  }

  function mailSource(row: DecisionRow): ReconMailSource {
    const descriptionLine = row.rawSubject?.trim() || row.rawBodyPreview?.trim() || row.vendor;
    return {
      graphMessageId: row.graphMessageId,
      descriptionLine,
      fallbackSubject: row.rawSubject ?? "",
      fallbackPreview: row.rawBodyPreview,
    };
  }

  function fileRow(row: DecisionRow) {
    if (!addSheet) return;
    const flow = flowFromStoredAmount(row.amountMinor);
    const magnitude = magnitudeFromStoredAmount(row.amountMinor);
    repeatRef.current = false;
    addSheet.open({
      title: row.vendor,
      submitLabel: "File it",
      tab: flow === "in" ? "income" : "spend",
      amountMinor: magnitude,
      date: row.txnDate,
      categoryId: flow === "out" ? (row.suggestedCategoryId ?? undefined) : undefined,
      note: `Recon: ${row.vendor}`,
      extraControl: flow === "out" ? <RepeatToggle onChange={(on) => (repeatRef.current = on)} /> : undefined,
      onSubmit: async (values) => {
        const asIncome = values.tab === "income";
        if (!asIncome && values.categoryId == null) {
          return { ok: false as const, error: "Pick a category" };
        }
        const res = await fetch(`/api/recon/items/${row.itemId}/accept-add`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryId: asIncome ? undefined : values.categoryId,
            accountId: values.accountId ?? null,
            amount: values.amountMinor,
            note: values.note ?? undefined,
            entryKind: asIncome ? "income" : "expense",
            incomeType: asIncome ? legacyTypeForKind(values.incomeKind) : undefined,
            split: asIncome
              ? undefined
              : values.participants.length > 1
                ? values.participants
                : undefined,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          return { ok: false as const, error: body?.error ?? "Could not file it" };
        }
        if (!asIncome && repeatRef.current && values.categoryId != null) {
          const made = await createReconRule({
            matchKind: "merchant_exact",
            matchValue: row.merchantKey || row.vendor,
            categoryId: values.categoryId,
            participantUserIds: values.participants.map((p) => p.userId),
          });
          if (!made.success) toast.error(`Filed, but the rule was not saved: ${made.error}`);
        }
        return { ok: true as const };
      },
      onSaved: () => router.refresh(),
    });
  }

  return (
    <>
      <Card className="rounded-2xl px-3.5 py-0">
        {rows.map((row) => (
          <button
            key={row.itemId}
            type="button"
            onClick={() => setMail(row)}
            className="flex w-full items-center justify-between gap-3 border-b border-border/50 py-3.5 text-left last:border-0 cursor-pointer hover:bg-accent/40"
            aria-label={`View bank message for ${row.vendor}`}
          >
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-medium">{row.vendor}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {row.txnDate}
                {row.suggestedCategoryName ? ` · maybe ${row.suggestedCategoryName}` : ""}
              </span>
            </span>
            <ReconAmount amountMinor={row.amountMinor} />
          </button>
        ))}
      </Card>

      <ReconMailDetailDialog
        source={mail ? mailSource(mail) : null}
        onOpenChange={(open) => {
          if (!open) setMail(null);
        }}
        primaryAction={
          mail && addSheet
            ? {
                label: "File it",
                onClick: () => {
                  const row = mail;
                  setMail(null);
                  window.setTimeout(() => fileRow(row), 0);
                },
              }
            : undefined
        }
      />
    </>
  );
}
