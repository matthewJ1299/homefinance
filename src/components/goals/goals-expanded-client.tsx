"use client";

import { Suspense, useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { GoalDetailResponse } from "@/lib/services/goal-detail.service";
import type { AccountType, Goal, GoalStrategy, GoalType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MonthNavigator } from "@/components/layout/month-navigator";
import { useMonthNavigation } from "@/hooks/use-month-navigation";
import { GoalActivitySection } from "@/components/goals/goal-activity-section";
import {
  GoalControlsSection,
  type GoalActionAccountOption,
} from "@/components/goals/goal-controls-section";
import { GoalOverviewSection } from "@/components/goals/goal-overview-section";
import { GoalProgressSection } from "@/components/goals/goal-progress-section";
import { GoalProjectionSection } from "@/components/goals/goal-projection-section";
import { toast } from "sonner";

function parseRandToMinorUnits(value: string): number | null {
  const cleaned = value.replace(/\s/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100);
}

function GoalsExpandedInner({ initialGoals }: { initialGoals: Goal[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { month } = useMonthNavigation();
  const [isPending, startTransition] = useTransition();

  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [accounts, setAccounts] = useState<GoalActionAccountOption[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const g = searchParams.get("goal");
    if (g) {
      const n = Number(g);
      if (Number.isFinite(n)) return n;
    }
    return initialGoals[0]?.id ?? null;
  });
  const [detail, setDetail] = useState<GoalDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const ACTIVITY_PAGE = 30;

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<GoalType>("savings");
  const [targetAmount, setTargetAmount] = useState("");
  const [monthlyTarget, setMonthlyTarget] = useState("");
  const [linkedAccountId, setLinkedAccountId] = useState("");
  const [apr, setApr] = useState("");
  const [strategy, setStrategy] = useState("");

  const syncGoalParam = useCallback(
    (id: number | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id != null) params.set("goal", String(id));
      else params.delete("goal");
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const refreshGoals = useCallback(async () => {
    const res = await fetch("/api/goals");
    if (res.ok) {
      const data = await res.json();
      setGoals(data.goals ?? []);
    }
  }, []);

  const loadDetail = useCallback(async (goalId: number, offset: number, append: boolean) => {
    setDetailLoading(true);
    try {
      const res = await fetch(
        `/api/goals/${goalId}/detail?month=${encodeURIComponent(month)}&limit=${ACTIVITY_PAGE}&offset=${offset}`
      );
      if (!res.ok) {
        if (!append) setDetail(null);
        return;
      }
      const data = (await res.json()) as GoalDetailResponse;
      if (append) {
        setDetail((prev) => {
          if (!prev || prev.goal.id !== goalId) return data;
          return {
            ...data,
            activity: {
              ...data.activity,
              rows: [...prev.activity.rows, ...data.activity.rows],
            },
          };
        });
      } else {
        setDetail(data);
      }
    } finally {
      setDetailLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void fetch("/api/accounts").then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      setAccounts(
        (data.accounts ?? []).map((a: { id: number; name: string; type: AccountType }) => ({
          id: a.id,
          name: a.name,
          type: a.type,
        }))
      );
    });
  }, []);

  useEffect(() => {
    if (selectedId == null) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedId, 0, false);
  }, [selectedId, month, loadDetail]);

  const selectedGoal = goals.find((g) => g.id === selectedId) ?? null;

  const handleControlsDone = useCallback(async () => {
    const res = await fetch("/api/goals");
    if (!res.ok) return;
    const data = await res.json();
    const nextGoals: Goal[] = data.goals ?? [];
    setGoals(nextGoals);
    const sid = selectedId;
    if (sid != null && !nextGoals.some((g) => g.id === sid)) {
      const nextId = nextGoals[0]?.id ?? null;
      setSelectedId(nextId);
      syncGoalParam(nextId);
    } else if (sid != null) {
      await loadDetail(sid, 0, false);
    }
    router.refresh();
  }, [selectedId, loadDetail, router, syncGoalParam]);

  const canCreate = () => {
    if (!name.trim()) return false;
    const monthly = parseRandToMinorUnits(monthlyTarget);
    if (monthly == null || monthly <= 0) return false;
    if (type === "savings") {
      const target = parseRandToMinorUnits(targetAmount);
      if (target == null || target <= 0) return false;
    }
    if (type === "credit" && !linkedAccountId) return false;
    if (apr.trim()) {
      const aprNum = parseFloat(apr.replace(",", "."));
      if (!Number.isFinite(aprNum) || aprNum < 0) return false;
    }
    return true;
  };

  const handleCreate = () => {
    if (!canCreate()) return;
    const monthly = parseRandToMinorUnits(monthlyTarget)!;
    const target = type === "savings" ? parseRandToMinorUnits(targetAmount)! : null;
    const linked = linkedAccountId ? Number(linkedAccountId) : null;
    const aprNum = apr.trim() ? parseFloat(apr.replace(",", ".")) : null;

    startTransition(async () => {
      const snapshot = goals;
      const tempId = -Date.now();
      const optimisticGoal: Goal = {
        id: tempId,
        ownerUserId: 0,
        name: name.trim(),
        type,
        targetAmount: target,
        monthlyTarget: monthly,
        linkedAccountId: linked,
        apr: aprNum,
        strategy: (strategy ? (strategy as GoalStrategy) : null),
        archivedAt: null,
        createdAt: new Date().toISOString(),
      };
      setGoals((prev) => [optimisticGoal, ...prev]);
      setSelectedId(tempId);
      syncGoalParam(tempId);

      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          targetAmount: target,
          monthlyTarget: monthly,
          linkedAccountId: linked,
          apr: aprNum,
          strategy: strategy || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setName("");
        setTargetAmount("");
        setMonthlyTarget("");
        setLinkedAccountId("");
        setApr("");
        setStrategy("");
        setShowAdd(false);
        await refreshGoals();
        const newId = data.goal?.id as number | undefined;
        if (newId != null) {
          setGoals((prev) => prev.map((g) => (g.id === tempId ? { ...g, id: newId } : g)));
          setSelectedId(newId);
          syncGoalParam(newId);
        }
        router.refresh();
        toast.success("Goal created.");
      } else {
        setGoals(snapshot);
        const prevId = snapshot[0]?.id ?? null;
        setSelectedId(prevId);
        syncGoalParam(prevId);
        const err = await res.json();
        toast.error(err.error ?? "Failed to create goal.");
      }
    });
  };

  const linkedOptions =
    type === "credit" ? accounts.filter((a) => a.type === "credit") : accounts;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MonthNavigator />
      </div>

      {goals.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Label className="shrink-0 text-muted-foreground">Goal</Label>
          <select
            className="w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={selectedId ?? ""}
            onChange={(e) => {
              const v = e.target.value ? Number(e.target.value) : null;
              setSelectedId(v);
              syncGoalParam(v);
            }}
          >
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.type})
              </option>
            ))}
          </select>
        </div>
      )}

      {detailLoading && selectedId != null && (
        <p className="text-sm text-muted-foreground">Loading goal…</p>
      )}

      {selectedGoal && detail && (
        <div className="space-y-4">
          <GoalOverviewSection detail={detail} />
          <GoalProgressSection detail={detail} />
          <GoalActivitySection
            rows={detail.activity.rows}
            total={detail.activity.total}
            limit={detail.activity.limit}
            offset={detail.activity.offset}
            onLoadMore={
              detail.activity.rows.length < detail.activity.total
                ? () => void loadDetail(selectedGoal.id, detail.activity.rows.length, true)
                : undefined
            }
          />
          <GoalProjectionSection goal={selectedGoal} month={month} detail={detail} />
          <GoalControlsSection
            key={selectedGoal.id}
            goal={selectedGoal}
            accounts={accounts}
            onDone={() => void handleControlsDone()}
          />
        </div>
      )}

      {goals.length === 0 && !showAdd && (
        <p className="text-sm text-muted-foreground">
          No goals yet. Create one to track intent separately from spending.
        </p>
      )}

      {showAdd ? (
        <div className="rounded-lg border border-solid p-4 space-y-3">
          <h2 className="text-sm font-medium">New goal</h2>
          <div>
            <Label>Goal name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Car" className="mt-1" />
          </div>
          <div>
            <Label>Type</Label>
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={type}
              onChange={(e) => {
                setType(e.target.value as GoalType);
                setLinkedAccountId("");
              }}
            >
              <option value="savings">Savings</option>
              <option value="credit">Credit</option>
            </select>
          </div>
          {type === "savings" && (
            <div>
              <Label>Target amount (R)</Label>
              <Input
                className="mt-1"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
              />
            </div>
          )}
          <div>
            <Label>Monthly target (R)</Label>
            <Input
              className="mt-1"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={monthlyTarget}
              onChange={(e) => setMonthlyTarget(e.target.value)}
            />
          </div>
          <div>
            <Label>{type === "credit" ? "Linked credit account" : "Linked account (recommended)"}</Label>
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={linkedAccountId}
              onChange={(e) => setLinkedAccountId(e.target.value)}
            >
              <option value="">{type === "credit" ? "Select credit account" : "None"}</option>
              {linkedOptions.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.name} ({a.type})
                </option>
              ))}
            </select>
          </div>
          {type === "credit" && (
            <>
              <div>
                <Label>APR (e.g. 0.18 for 18%)</Label>
                <Input className="mt-1" type="text" inputMode="decimal" placeholder="0.00" value={apr} onChange={(e) => setApr(e.target.value)} />
              </div>
              <div>
                <Label>Strategy</Label>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                >
                  <option value="">None</option>
                  <option value="avalanche">Avalanche</option>
                  <option value="snowball">Snowball</option>
                  <option value="target_date">Target date</option>
                </select>
              </div>
            </>
          )}
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={isPending || !canCreate()}>
              {isPending ? "Adding…" : "Add goal"}
            </Button>
            <Button variant="outline" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
          Add goal
        </Button>
      )}
    </div>
  );
}

export function GoalsExpandedClient({ initialGoals }: { initialGoals: Goal[] }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <GoalsExpandedInner initialGoals={initialGoals} />
    </Suspense>
  );
}
