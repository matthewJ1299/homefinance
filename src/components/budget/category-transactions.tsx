"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { AvatarCircle } from "@/components/ui/avatar-circle";
import { formatRand } from "@/lib/utils/currency";
import type { ExpenseWithDetails } from "@/lib/types";

export function CategoryTransactions({
  month,
  categoryId,
}: {
  month: string; // yyyy-MM
  categoryId: number;
}) {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    fetch(`/api/expenses?month=${encodeURIComponent(month)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch expenses");
        const data = (await res.json()) as { expenses?: ExpenseWithDetails[] };
        const list = Array.isArray(data.expenses) ? data.expenses : [];
        return list.filter((e) => e.categoryId === categoryId);
      })
      .then((filtered) => {
        if (!alive) return;
        setExpenses(
          filtered.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
        );
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Failed to load transactions");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [month, categoryId]);

  const groupedLabel = useMemo(() => {
    return `${month}`;
  }, [month]);

  if (loading) {
    return (
      <div className="mt-3 rounded-xl border bg-background p-3 text-xs text-muted-foreground">
        Loading transactions...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-3 rounded-xl border bg-background p-3 text-xs text-destructive">
        {error}
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="mt-3 rounded-xl border bg-background p-3 text-xs text-muted-foreground">
        No transactions for this category in {groupedLabel}.
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {expenses.map((e) => (
        <div
          key={e.id}
          className="flex items-start justify-between gap-3 rounded-xl border bg-background p-3"
        >
          <div className="flex items-start gap-2 min-w-0">
            <AvatarCircle name={e.userName} size={26} />
            <div className="min-w-0">
              <div className="text-xs font-medium truncate">{e.note ?? e.categoryName}</div>
              <div className="text-[11px] text-muted-foreground">
                {format(new Date(e.date + "T12:00:00"), "d MMM")} • {e.userName}
              </div>
            </div>
          </div>
          <div className="text-xs text-destructive font-medium tabular-nums shrink-0">
            -{formatRand(e.amount)}
          </div>
        </div>
      ))}
    </div>
  );
}

