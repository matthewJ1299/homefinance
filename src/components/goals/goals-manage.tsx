"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AccountType, GoalType, Goal } from "@/lib/types";
import { formatRand } from "@/lib/utils/currency";

type AccountOption = { id: number; name: string; type: AccountType };

function parseRandToMinorUnits(value: string): number | null {
  const cleaned = value.replace(/\s/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100);
}

export function GoalsManage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<GoalType>("savings");
  const [targetAmount, setTargetAmount] = useState("");
  const [monthlyTarget, setMonthlyTarget] = useState("");
  const [linkedAccountId, setLinkedAccountId] = useState<string>("");
  const [apr, setApr] = useState("");
  const [strategy, setStrategy] = useState<string>("");

  async function fetchAll() {
    const [goalsRes, accountsRes] = await Promise.all([
      fetch("/api/goals"),
      fetch("/api/accounts"),
    ]);

    if (goalsRes.ok) {
      const data = await goalsRes.json();
      setGoals(data.goals ?? []);
    }
    if (accountsRes.ok) {
      const data = await accountsRes.json();
      setAccounts((data.accounts ?? []).map((a: any) => ({ id: a.id, name: a.name, type: a.type })));
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchAll();
  }, []);

  const linkedOptions =
    type === "credit" ? accounts.filter((a) => a.type === "credit") : accounts;

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
        setName("");
        setTargetAmount("");
        setMonthlyTarget("");
        setLinkedAccountId("");
        setApr("");
        setStrategy("");
        setShowAdd(false);
        await fetchAll();
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error ?? "Failed to create goal");
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this goal?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchAll();
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error ?? "Failed to delete");
      }
    });
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading goals...</p>;

  return (
    <div className="space-y-4">
      {goals.length === 0 && !showAdd && (
        <p className="text-sm text-muted-foreground">
          No goals yet. Create one to track intent separately from spending.
        </p>
      )}

      <ul className="space-y-2">
        {goals.map((g) => (
          <li
            key={g.id}
            className="flex items-center justify-between gap-4 rounded-lg border bg-card p-3 text-sm"
          >
            <div>
              <span className="font-medium">{g.name}</span>
              <span className="ml-2 text-muted-foreground capitalize">({g.type})</span>
              <div className="text-xs text-muted-foreground mt-1">
                Monthly target: {formatRand(g.monthlyTarget)}
                {g.type === "savings" && g.targetAmount != null && (
                  <>
                    {" "}
                    | Target: {formatRand(g.targetAmount)}
                  </>
                )}
                {g.type === "credit" && g.apr != null && <> | APR: {g.apr}</>}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => handleDelete(g.id)}
              disabled={isPending}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>

      {showAdd ? (
        <div className="rounded-lg border p-4 space-y-3">
          <div>
            <Label>Goal name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Car" />
          </div>
          <div>
            <Label>Type</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
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
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
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
                <Label>APR (e.g. 0.22 for 22%)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={apr}
                  onChange={(e) => setApr(e.target.value)}
                />
              </div>
              <div>
                <Label>Strategy</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                >
                  <option value="">Auto (best)</option>
                  <option value="avalanche">Avalanche</option>
                  <option value="snowball">Snowball</option>
                  <option value="target_date">Target date</option>
                </select>
              </div>
            </>
          )}
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={isPending || !canCreate()}>
              {isPending ? "Adding..." : "Add goal"}
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

