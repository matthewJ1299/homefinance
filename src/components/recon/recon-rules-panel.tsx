"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { formatRand } from "@/lib/utils/currency";
import { formatDisplayDate } from "@/lib/utils/date";
import { acceptAllRuleMatched, deleteReconRule } from "@/lib/actions/recon-rule.actions";
import type { ReconRuleRow } from "@/lib/repositories/interfaces/recon-rule.repository";

export interface MatchedRowSummary {
  itemId: number;
  vendor: string;
  amountMinor: number;
  txnDate: string;
  categoryName: string;
  participantNames: string[];
}

/**
 * The rule-matched group and the rules behind it.
 *
 * Six rows that a rule already decided get one button, not six -- that is the
 * whole reason to keep rules. What is left sits under "Need a decision", which
 * is the only thing on the page asking for attention.
 */
export function ReconRulesPanel({
  matched,
  rules,
  totalThisMonth,
  unmatchedCount,
}: {
  matched: MatchedRowSummary[];
  rules: ReconRuleRow[];
  /** Rows that arrived this month, for the caught-up line. */
  totalThisMonth: number;
  unmatchedCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rulesOpen, setRulesOpen] = useState(false);

  function acceptAll() {
    startTransition(async () => {
      const res = await acceptAllRuleMatched();
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(
        res.failed > 0
          ? `Sorted ${res.accepted}. ${res.failed} needed a closer look.`
          : `Sorted ${res.accepted} without you.`
      );
      router.refresh();
    });
  }

  const sortedThemselves = Math.max(0, totalThisMonth - unmatchedCount);

  return (
    <div className="space-y-4">
      {/* Own mailbox only, stated on screen rather than assumed. */}
      <p className="text-xs text-muted-foreground">
        Only your mailbox is read, and only by you. Your rules are yours alone.
      </p>

      {matched.length > 0 ? (
        <section className="space-y-2">
          <SectionHeader
            title={`${matched.length} your rules can place`}
            action={
              <Button onClick={acceptAll} disabled={pending} className="h-9 rounded-full px-3.5 text-xs">
                {pending ? "Accepting…" : "Accept all"}
              </Button>
            }
          />
          {/* Guessed and matched rows read calm: the amber border is reserved
              for merchants nothing can place. */}
          <Card className="rounded-2xl px-3.5 py-1.5">
            {matched.map((m) => (
              <div
                key={m.itemId}
                className="flex items-baseline justify-between gap-3 border-b border-border/50 py-2.5 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.vendor}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.categoryName}
                    {m.participantNames.length > 0
                      ? ` · split with ${m.participantNames.join(", ")}`
                      : ""}
                    {" · "}
                    {formatDisplayDate(m.txnDate)}
                  </p>
                </div>
                <span className="shrink-0 text-sm tabular-nums">{formatRand(m.amountMinor)}</span>
              </div>
            ))}
          </Card>
        </section>
      ) : null}

      {totalThisMonth > 0 && unmatchedCount === 0 ? (
        <Card className="rounded-2xl border-success/35 bg-success-surface p-4">
          <p className="text-[13px] font-semibold text-success">Caught up</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalThisMonth} transaction{totalThisMonth === 1 ? "" : "s"} came in this month, and
            your rules placed{" "}
            {sortedThemselves === totalThisMonth ? "every one" : String(sortedThemselves)}. Nothing
            needs you.
          </p>
        </Card>
      ) : null}

      <div>
        <button
          type="button"
          onClick={() => setRulesOpen((v) => !v)}
          aria-expanded={rulesOpen}
          className="min-h-11 cursor-pointer text-sm font-semibold text-primary"
        >
          {rulesOpen ? "Hide your rules" : `Your rules (${rules.length})`}
        </button>
        {rulesOpen ? (
          <Card className="mt-2 rounded-2xl px-3.5 py-1.5">
            {rules.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">
                No rules yet. Tick &ldquo;Do this every time&rdquo; when you accept a row and it
                lands here.
              </p>
            ) : (
              rules.map((r) => (
                <div
                  key={r.id}
                  className="flex items-baseline justify-between gap-3 border-b border-border/50 py-2.5 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      {r.matchKind === "merchant_exact" ? r.matchValue : `contains "${r.matchValue}"`}
                      {" → "}
                      {r.categoryName ?? "no category"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Used {r.timesUsed} time{r.timesUsed === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    className="h-9 shrink-0 text-destructive"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await deleteReconRule(r.id);
                        if (!res.success) toast.error(res.error);
                        else router.refresh();
                      })
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
          </Card>
        ) : null}
      </div>

      {unmatchedCount > 0 ? <SectionHeader title="Need a decision" /> : null}
    </div>
  );
}
