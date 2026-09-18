"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { ReconRuleSheet, type RuleSheetCategory } from "@/components/recon/recon-rule-sheet";
import { ReconAmount } from "@/components/recon/recon-amount";
import { formatDisplayDate } from "@/lib/utils/date";
import { acceptAllRuleMatched } from "@/lib/actions/recon-rule.actions";
import type { ReconRuleRow } from "@/lib/repositories/interfaces/recon-rule.repository";
import type { HouseholdMember } from "@/lib/types/household-member";

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
  currentUserId,
  members,
  categories,
}: {
  matched: MatchedRowSummary[];
  rules: ReconRuleRow[];
  /** Rows that arrived this month, for the caught-up line. */
  totalThisMonth: number;
  unmatchedCount: number;
  currentUserId: number;
  members: HouseholdMember[];
  categories: RuleSheetCategory[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [rulesOpen, setRulesOpen] = useState(false);
  const [editing, setEditing] = useState<ReconRuleRow | null>(null);
  const nameById = new Map(members.map((m) => [m.id, m.name]));

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
      // The super-admin "Fetched emails" list keys "handled" off the live
      // pending set, so accepting here must refresh it as Process marked does.
      void queryClient.invalidateQueries({ queryKey: ["recon-items"] });
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
                className="flex items-center justify-between gap-3 border-b border-border/50 py-2.5 last:border-0"
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
                <ReconAmount amountMinor={m.amountMinor} className="text-sm" />
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
              rules.map((r) => {
                const splitNames = r.participantUserIds
                  .filter((id) => id !== currentUserId)
                  .map((id) => nameById.get(id) ?? "Someone");
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setEditing(r)}
                    className="flex w-full items-baseline justify-between gap-3 border-b border-border/50 py-2.5 text-left last:border-0 cursor-pointer hover:bg-accent/40"
                    aria-label={`Edit rule for ${r.matchValue}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm">
                        {r.matchKind === "merchant_exact"
                          ? r.matchValue
                          : `contains "${r.matchValue}"`}
                        {" → "}
                        {r.categoryName ?? "no category"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {splitNames.length > 0 ? `Split with ${splitNames.join(", ")} · ` : ""}
                        Used {r.timesUsed} time{r.timesUsed === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-primary">Edit</span>
                  </button>
                );
              })
            )}
          </Card>
        ) : null}
      </div>

      <ReconRuleSheet
        rule={editing}
        currentUserId={currentUserId}
        members={members}
        categories={categories}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
