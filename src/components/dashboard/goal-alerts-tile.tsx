"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatRand } from "@/lib/utils/currency";

type AlertItem = {
  goalName: string;
  behindBy: number;
};

export function GoalAlertsTile({ month }: { month: string }) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    fetch(`/api/goals/summary?month=${encodeURIComponent(month)}`)
      .then((res) => (res.ok ? res.json() : { savings: [] }))
      .then((data) => {
        const savings = Array.isArray(data.savings) ? data.savings : [];
        const next: AlertItem[] = savings
          .filter((s: any) => Number(s.monthlyDelta ?? 0) < 0)
          .map((s: any) => ({
            goalName: String(s.goal?.name ?? "Goal"),
            behindBy: Math.abs(Number(s.monthlyDelta ?? 0)),
          }));
        setAlerts(next);
      })
      .catch(() => setAlerts([]));
  }, [month]);

  if (alerts.length === 0) return null;

  return (
    <Link
      href="/goals"
      className="block rounded-lg border bg-card p-3 text-sm text-card-foreground shadow-sm hover:bg-accent/50"
    >
      <div className="font-medium mb-1">Goal alerts</div>
      <div className="space-y-1 text-xs text-muted-foreground">
        {alerts.slice(0, 3).map((a) => (
          <div key={a.goalName}>
            Behind on {a.goalName} by {formatRand(a.behindBy)}
          </div>
        ))}
        {alerts.length > 3 && <div>+{alerts.length - 3} more</div>}
      </div>
    </Link>
  );
}

