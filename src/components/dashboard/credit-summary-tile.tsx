"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatRand } from "@/lib/utils/currency";

type CreditGoalProgress = {
  goal: { id: number; name: string };
  balance: number;
  debt: number;
  monthlyTarget: number;
  payoffMonths: number | null;
  totalInterest: number;
};

export function CreditSummaryTile() {
  const [loading, setLoading] = useState(true);
  const [credit, setCredit] = useState<CreditGoalProgress[]>([]);

  useEffect(() => {
    fetch("/api/goals/summary")
      .then((res) => (res.ok ? res.json() : { credit: [] }))
      .then((data) => setCredit(Array.isArray(data.credit) ? data.credit : []))
      .finally(() => setLoading(false));
  }, []);

  if (loading && credit.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
        Loading credit goals...
      </div>
    );
  }

  if (credit.length === 0) {
    return (
      <Link
        href="/goals"
        className="block rounded-lg border bg-card p-3 text-sm text-card-foreground shadow-sm hover:bg-accent/50"
      >
        <span className="text-muted-foreground">Credit: </span>
        No credit goals yet. Create one.
      </Link>
    );
  }

  const g = credit[0]!;
  return (
    <div className="rounded-lg border bg-card p-3 text-sm text-card-foreground shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <Link href="/goals" className="font-medium underline hover:no-underline">
          Credit goal
        </Link>
        <span className="text-xs text-muted-foreground">{g.goal.name}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>
          <div className="uppercase tracking-wide">Balance</div>
          <div className="font-medium text-foreground">{formatRand(g.balance)}</div>
        </div>
        <div>
          <div className="uppercase tracking-wide">Suggested payment</div>
          <div className="font-medium text-foreground">{formatRand(g.monthlyTarget)}</div>
        </div>
        <div>
          <div className="uppercase tracking-wide">Payoff (months)</div>
          <div className="font-medium text-foreground">
            {g.payoffMonths == null ? "N/A" : g.payoffMonths}
          </div>
        </div>
        <div>
          <div className="uppercase tracking-wide">Interest (est.)</div>
          <div className="font-medium text-foreground">{formatRand(g.totalInterest)}</div>
        </div>
      </div>
    </div>
  );
}

