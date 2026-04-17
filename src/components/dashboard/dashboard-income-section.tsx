"use client";

import Link from "next/link";
import type { IncomeEntry } from "@/lib/repositories/interfaces/income.repository";
import { WhenDashboardTileEnabled } from "@/components/dashboard/when-dashboard-tile-enabled";
import { IncomeQuickAdd } from "@/components/income/income-quick-add";
import { IncomeList } from "@/components/income/income-list";
import { formatRand } from "@/lib/utils/currency";

interface DashboardIncomeSectionProps {
  month: string;
  monthLabelPretty: string;
  defaultDate: string;
  entries: IncomeEntry[];
  total: number;
}

export function DashboardIncomeSection({
  month,
  monthLabelPretty,
  defaultDate,
  entries,
  total,
}: DashboardIncomeSectionProps) {
  return (
    <WhenDashboardTileEnabled tile="incomeSection">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold tracking-tight">Income this month</h2>
            <p className="text-xs text-muted-foreground">{monthLabelPretty}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">{formatRand(total)}</span>
            <Link
              href={`/income?month=${encodeURIComponent(month)}`}
              className="text-xs font-medium text-primary hover:underline cursor-pointer"
            >
              View more
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/90 p-3 shadow-sm space-y-4">
          <IncomeQuickAdd defaultDate={defaultDate} />
          <div className="rounded-xl border border-border/60 bg-background/70 p-3">
            <IncomeList entries={entries} />
          </div>
        </div>
      </section>
    </WhenDashboardTileEnabled>
  );
}
