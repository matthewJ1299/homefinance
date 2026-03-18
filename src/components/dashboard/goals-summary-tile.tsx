"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatRand } from "@/lib/utils/currency";

type SavingsGoalProgress = {
  goal: { id: number; name: string };
  current: number;
  target: number;
  progressPct: number;
  monthlyTarget: number;
  monthlyActual: number;
  monthlyDelta: number;
  projectedCompletionMonth: string | null;
};

export function GoalsSummaryTile({ month }: { month: string }) {
  const [loading, setLoading] = useState(true);
  const [savings, setSavings] = useState<SavingsGoalProgress[]>([]);

  useEffect(() => {
    fetch(`/api/goals/summary?month=${encodeURIComponent(month)}`)
      .then((res) => (res.ok ? res.json() : { savings: [] }))
      .then((data) => setSavings(Array.isArray(data.savings) ? data.savings : []))
      .finally(() => setLoading(false));
  }, [month]);

  if (loading && savings.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
        Loading goals...
      </div>
    );
  }

  if (savings.length === 0) {
    return (
      <Link
        href="/goals"
        className="block rounded-lg border bg-card p-3 text-sm text-card-foreground shadow-sm hover:bg-accent/50"
      >
        <span className="text-muted-foreground">Goals: </span>
        No savings goals yet. Create one.
      </Link>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-3 text-sm text-card-foreground shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <Link href="/goals" className="font-medium underline hover:no-underline">
          Savings goals
        </Link>
        <span className="text-xs text-muted-foreground">{month}</span>
      </div>
      <div className="space-y-2">
        {savings.slice(0, 3).map((g) => (
          <div key={g.goal.id} className="text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{g.goal.name}</span>
              <span className="text-muted-foreground">
                {Math.round((g.progressPct ?? 0) * 100)}%
              </span>
            </div>
            <div className="text-muted-foreground">
              {formatRand(g.current)} / {formatRand(g.target)} • This month:{" "}
              {formatRand(g.monthlyActual)} ({g.monthlyDelta >= 0 ? "+" : "-"}
              {formatRand(Math.abs(g.monthlyDelta))} vs target)
              {g.projectedCompletionMonth && <> • ETA: {g.projectedCompletionMonth}</>}
            </div>
          </div>
        ))}
        {savings.length > 3 && (
          <div className="text-xs text-muted-foreground">+{savings.length - 3} more</div>
        )}
      </div>
    </div>
  );
}

