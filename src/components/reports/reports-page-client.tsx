"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { formatRand } from "@/lib/utils/currency";
import { formatMonth } from "@/lib/utils/date";
import type {
  BudgetAccuracyRow,
  CategoryTotalRow,
  MonthlyInOutRow,
  MortgageSplitRow,
} from "@/lib/services/report.service";

type Tab = "overview" | "categories" | "accuracy" | "house";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "categories", label: "Categories" },
  { key: "accuracy", label: "Budget accuracy" },
  { key: "house", label: "The house" },
];

/** Bars only. A line implies a trend between points that months do not have. */
function InOutBars({ months, currentMonth }: { months: MonthlyInOutRow[]; currentMonth: string }) {
  const max = Math.max(1, ...months.map((m) => Math.max(m.incomeMinor, m.spentMinor)));
  return (
    <div className="overflow-x-auto">
      <div className="flex h-[132px] min-w-full items-end justify-between gap-1">
        {months.map((m) => {
          // The current month is dimmed: comparing a part-month against full
          // ones is the most common way a chart like this misleads.
          const isPartial = m.month === currentMonth;
          return (
            <div
              key={m.month}
              className={cn("flex flex-1 flex-col items-center gap-1.5", isPartial && "opacity-45")}
              title={`${formatMonth(m.month)} · in ${formatRand(m.incomeMinor)} · out ${formatRand(m.spentMinor)}`}
            >
              <div className="flex h-[120px] items-end gap-0.5">
                <div
                  className="w-[7px] rounded-t-sm bg-success"
                  style={{ height: `${(m.incomeMinor / max) * 120}px` }}
                />
                <div
                  className="w-[7px] rounded-t-sm bg-primary"
                  style={{ height: `${(m.spentMinor / max) * 120}px` }}
                />
              </div>
              <span className="text-[9px] font-semibold text-muted-foreground">
                {m.month.slice(5)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Bar({ pct, tone = "primary" }: { pct: number; tone?: "primary" | "destructive" }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full", tone === "destructive" ? "bg-destructive" : "bg-primary")}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

export function ReportsPageClient({
  months,
  categories,
  accuracy,
  mortgage,
  observations,
  currentMonth,
  periodLabel,
}: {
  months: MonthlyInOutRow[];
  categories: CategoryTotalRow[];
  accuracy: BudgetAccuracyRow[];
  mortgage: MortgageSplitRow[];
  observations: string[];
  currentMonth: string;
  periodLabel: string;
}) {
  const [tab, setTab] = useState<Tab>("overview");

  if (months.length === 0) {
    return (
      <EmptyState
        title="Nothing to report yet"
        message="Once you've logged a month or two, this is where the shape of it shows up."
      />
    );
  }

  const totalIn = months.reduce((s, m) => s + m.incomeMinor, 0);
  const totalOut = months.reduce((s, m) => s + m.spentMinor, 0);
  const maxCategory = Math.max(1, ...categories.map((c) => c.totalMinor));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "min-h-11 rounded-full border px-3.5 text-sm font-medium cursor-pointer",
              tab === t.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-muted text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Reports are per-user by design; the toggle that used to say so is
          gone, so the scope has to be stated. */}
      <p className="text-xs text-muted-foreground">Your own spending · {periodLabel}</p>

      {tab === "overview" ? (
        <section className="space-y-3">
          <Card className="rounded-2xl p-4">
            <div className="flex justify-between pb-3 text-sm tabular-nums">
              <span>
                <span className="text-muted-foreground">In </span>
                <span className="font-semibold text-success">{formatRand(totalIn)}</span>
              </span>
              <span>
                <span className="text-muted-foreground">Out </span>
                <span className="font-semibold">{formatRand(totalOut)}</span>
              </span>
              <span>
                <span className="text-muted-foreground">Kept </span>
                <span
                  className={cn(
                    "font-semibold",
                    totalIn - totalOut < 0 && "text-destructive"
                  )}
                >
                  {formatRand(totalIn - totalOut)}
                </span>
              </span>
            </div>
            <InOutBars months={months} currentMonth={currentMonth} />
          </Card>

          {observations.length > 0 ? (
            <Card className="rounded-2xl border-success/35 bg-success-surface p-4">
              <p className="text-[13px] font-semibold text-success">Worth doing</p>
              <ul className="mt-1.5 space-y-1 text-sm">
                {observations.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </Card>
          ) : null}
        </section>
      ) : null}

      {tab === "categories" ? (
        <section className="space-y-2.5">
          <SectionHeader title="Where it went" />
          <Card className="rounded-2xl px-3.5 py-1.5">
            {categories.map((c) => (
              <div key={c.categoryId} className="space-y-1.5 border-b border-border/50 py-3 last:border-0">
                <div className="flex items-baseline justify-between gap-2.5">
                  <span className="min-w-0 truncate text-sm font-medium">{c.name}</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatRand(c.totalMinor)}
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      {Math.round(c.share * 100)}%
                    </span>
                  </span>
                </div>
                <Bar pct={(c.totalMinor / maxCategory) * 100} />
              </div>
            ))}
          </Card>
        </section>
      ) : null}

      {tab === "accuracy" ? (
        <section className="space-y-2.5">
          <SectionHeader title="Assigned versus actual" />
          <Card className="rounded-2xl px-3.5 py-1.5">
            {accuracy.map((r) => {
              const over = r.deltaMinor < 0;
              const cap = Math.max(r.assignedMinor, r.spentMinor, 1);
              return (
                <div key={r.categoryId} className="space-y-1.5 border-b border-border/50 py-3 last:border-0">
                  <div className="flex items-baseline justify-between gap-2.5">
                    <div className="min-w-0">
                      <span className="text-sm font-medium">{r.name}</span>
                      <span className="block text-[11px] text-muted-foreground tabular-nums">
                        {formatRand(r.spentMinor)} spent of {formatRand(r.assignedMinor)} assigned
                      </span>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-sm font-semibold tabular-nums",
                        over ? "text-destructive" : "text-primary"
                      )}
                    >
                      {formatRand(Math.abs(r.deltaMinor))} {over ? "over" : "spare"}
                    </span>
                  </div>
                  <Bar pct={(r.spentMinor / cap) * 100} tone={over ? "destructive" : "primary"} />
                </div>
              );
            })}
          </Card>
        </section>
      ) : null}

      {tab === "house" ? (
        <section className="space-y-2.5">
          <SectionHeader title="Interest versus equity" />
          {mortgage.length === 0 ? (
            <EmptyState
              title="No bond set up"
              message="Add the house on the Mortgage page and this fills in."
            />
          ) : (
            <Card className="rounded-2xl p-4">
              <div className="overflow-x-auto">
                <div className="flex h-[132px] min-w-full items-end justify-between gap-1">
                  {mortgage.slice(0, 36).map((m) => {
                    const max = Math.max(
                      1,
                      ...mortgage.slice(0, 36).map((x) => x.interestMinor + x.equityMinor)
                    );
                    return (
                      <div
                        key={m.month}
                        className="flex flex-1 flex-col items-center gap-1.5"
                        title={`${m.month} · interest ${formatRand(m.interestMinor)} · equity ${formatRand(m.equityMinor)}`}
                      >
                        <div className="flex h-[120px] items-end gap-0.5">
                          <div
                            className="w-[7px] rounded-t-sm bg-destructive"
                            style={{ height: `${(m.interestMinor / max) * 120}px` }}
                          />
                          <div
                            className="w-[7px] rounded-t-sm bg-success"
                            style={{ height: `${(m.equityMinor / max) * 120}px` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="pt-2 text-xs text-muted-foreground">
                Red is interest, green is what you actually own. The green grows.
              </p>
            </Card>
          )}
        </section>
      ) : null}
    </div>
  );
}
