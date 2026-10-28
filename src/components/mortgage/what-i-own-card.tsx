"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Sheet } from "@/components/ui/sheet";
import { formatRand } from "@/lib/utils/currency";
import type { OwnershipView } from "@/lib/services/finance/mortgage-ownership";
import type { StorySection } from "@/lib/services/finance/mortgage-story";

export interface MonthSplit {
  /** Your share of this month's payment. */
  yourShareMinor: number;
  /** Everyone else's share, named. */
  others: Array<{ name: string; monthlyMinor: number }>;
  /** Of your share, what the bank takes. */
  interestMinor: number;
  /** Of your share, what buys ownership. */
  equityMinor: number;
}

/**
 * The mortgage screen's headline.
 *
 * Share of what's paid for so far, not of the whole house. Amortisation, rate
 * periods and extra payments stay behind More details.
 */
export function WhatIOwnCard({
  ownership,
  meUserId,
  monthSplit,
  story,
}: {
  ownership: OwnershipView;
  meUserId: number;
  monthSplit: MonthSplit;
  story: StorySection[];
}) {
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const mine = ownership.slices.find((s) => s.userId === meUserId) ?? ownership.slices[0];
  if (!mine) return null;

  const total = ownership.paidForMinor + ownership.stillOwedMinor || 1;
  const depositPct = (mine.depositMinor / total) * 100;
  const paidOffPct = (mine.paidOffMinor / total) * 100;

  return (
    <>
      <Card className="rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">You own</span>
          <button
            type="button"
            onClick={() => setBreakdownOpen(true)}
            className="-my-2 min-h-11 cursor-pointer px-1 text-xs font-semibold text-primary"
          >
            Breakdown
          </button>
        </div>

        <p className="mt-3 text-[2.75rem] leading-none font-semibold tracking-tight tabular-nums">
          {Math.round(mine.shareOfPaidBp / 100)}%
        </p>
        <p className="mt-1.5 text-[15px]">of what&rsquo;s paid for so far</p>
        <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">
          {formatRand(mine.ownedMinor)} of {formatRand(ownership.paidForMinor)}
        </p>

        {/* Three parts: your deposit, what you have paid off since, and what
            the bank still has a claim on. */}
        <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-muted">
          <div className="bg-primary" style={{ width: `${depositPct}%` }} />
          <div className="bg-success" style={{ width: `${paidOffPct}%` }} />
        </div>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
              Your deposit
            </dt>
            <dd className="tabular-nums">{formatRand(mine.depositMinor)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
              Paid off since
            </dt>
            <dd className="tabular-nums">{formatRand(mine.paidOffMinor)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40" aria-hidden />
              Still owed
            </dt>
            <dd className="tabular-nums">{formatRand(ownership.stillOwedMinor)}</dd>
          </div>
        </dl>

        {story.length > 0 ? (
          <p className="mt-4 border-t border-border/60 pt-3 text-sm leading-relaxed text-muted-foreground">
            {story[0].body}
          </p>
        ) : null}
      </Card>

      <Card className="rounded-2xl px-4 py-1.5">
        <Row label="Your share this month" value={monthSplit.yourShareMinor} />
        {monthSplit.others.map((o) => (
          <Row key={o.name} label={`${o.name}'s share`} value={o.monthlyMinor} />
        ))}
        <Row
          label="Of yours, interest"
          note="the bank's cut"
          value={monthSplit.interestMinor}
          tone="muted"
        />
        <Row
          label="Of yours, into the house"
          note="buys your share"
          value={monthSplit.equityMinor}
          tone="good"
        />
      </Card>

      <Sheet open={breakdownOpen} onOpenChange={setBreakdownOpen} label="Ownership breakdown">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <h2 className="text-base font-semibold">How the shares work</h2>
          {story.map((s) => (
            <div key={s.title}>
              <p className="text-sm font-semibold">{s.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
          <div className="border-t border-border pt-3">
            <p className="pb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Everyone&rsquo;s share
            </p>
            {ownership.slices.map((s) => (
              <div
                key={s.userId}
                className="flex justify-between border-b border-border/50 py-2.5 text-sm last:border-0"
              >
                <span>{s.userName}</span>
                <span className="tabular-nums">
                  {Math.round(s.shareOfPaidBp / 100)}% · {formatRand(s.ownedMinor)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Sheet>
    </>
  );
}

function Row({
  label,
  note,
  value,
  tone = "default",
}: {
  label: string;
  note?: string;
  value: number;
  tone?: "default" | "muted" | "good";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/50 py-3 last:border-0">
      <div className="min-w-0">
        <span className="text-sm">{label}</span>
        {note ? <span className="block text-[11px] text-muted-foreground">{note}</span> : null}
      </div>
      <span
        className={cn(
          "shrink-0 text-sm font-semibold tabular-nums",
          tone === "muted" && "text-muted-foreground",
          tone === "good" && "text-success"
        )}
      >
        {formatRand(value)}
      </span>
    </div>
  );
}
