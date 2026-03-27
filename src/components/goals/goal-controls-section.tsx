"use client";

import { useState, useTransition } from "react";
import type { Goal } from "@/lib/types";
import type { AccountType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { toast } from "sonner";

export type GoalActionAccountOption = { id: number; name: string; type: AccountType };

function parseRandToMinorUnits(value: string): number | null {
  const cleaned = value.replace(/\s/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100);
}

export function GoalControlsSection({
  goal,
  accounts,
  onDone,
}: {
  goal: Goal;
  accounts: GoalActionAccountOption[];
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<
    "contribute" | "withdraw" | "pay" | "interest" | "edit" | "delete" | null
  >(null);

  const [amount, setAmount] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [note, setNote] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");

  const [editName, setEditName] = useState(goal.name);
  const [editTarget, setEditTarget] = useState("");
  const [editMonthly, setEditMonthly] = useState(String(goal.monthlyTarget / 100));
  const [editApr, setEditApr] = useState(goal.apr != null ? String(goal.apr) : "");
  const [editStrategy, setEditStrategy] = useState(goal.strategy ?? "");

  const resetForm = () => {
    setAmount("");
    setNote("");
    setEffectiveDate(format(new Date(), "yyyy-MM-dd"));
    setFromAccountId("");
    setToAccountId("");
  };

  const open = (d: typeof dialog) => {
    resetForm();
    if (d === "edit") {
      setEditName(goal.name);
      setEditTarget(goal.targetAmount != null ? String(goal.targetAmount / 100) : "");
      setEditMonthly(String(goal.monthlyTarget / 100));
      setEditApr(goal.apr != null ? String(goal.apr) : "");
      setEditStrategy(goal.strategy ?? "");
    }
    setDialog(d);
  };

  const bankLike = accounts.filter((a) => a.type === "bank" || a.type === "savings");

  const postJson = (url: string, body: unknown) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const handleContribute = () => {
    const minor = parseRandToMinorUnits(amount);
    const from = Number(fromAccountId);
    if (minor == null || minor <= 0 || !Number.isFinite(from)) return;
    startTransition(async () => {
      const res = await postJson(`/api/goals/${goal.id}/contribute`, {
        fromAccountId: from,
        amount: minor,
        effectiveDate,
        note: note || null,
      });
      if (res.ok) {
        setDialog(null);
        toast.success("Contribution added.");
        onDone();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to add contribution.");
      }
    });
  };

  const handleWithdraw = () => {
    const minor = parseRandToMinorUnits(amount);
    const to = Number(toAccountId);
    if (minor == null || minor <= 0 || !Number.isFinite(to)) return;
    startTransition(async () => {
      const res = await postJson(`/api/goals/${goal.id}/withdraw`, {
        toAccountId: to,
        amount: minor,
        effectiveDate,
        note: note || null,
      });
      if (res.ok) {
        setDialog(null);
        toast.success("Withdrawal added.");
        onDone();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to add withdrawal.");
      }
    });
  };

  const handlePay = () => {
    const minor = parseRandToMinorUnits(amount);
    const from = Number(fromAccountId);
    if (minor == null || minor <= 0 || !Number.isFinite(from)) return;
    startTransition(async () => {
      const res = await postJson(`/api/goals/${goal.id}/pay`, {
        fromAccountId: from,
        amount: minor,
        effectiveDate,
        note: note || null,
      });
      if (res.ok) {
        setDialog(null);
        toast.success("Payment recorded.");
        onDone();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to record payment.");
      }
    });
  };

  const handleInterest = () => {
    const minor = parseRandToMinorUnits(amount);
    if (minor == null || minor <= 0) return;
    startTransition(async () => {
      const res = await postJson(`/api/goals/${goal.id}/interest`, {
        amount: minor,
        effectiveDate,
        note: note || null,
      });
      if (res.ok) {
        setDialog(null);
        toast.success("Interest recorded.");
        onDone();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to record interest.");
      }
    });
  };

  const handleEdit = () => {
    const monthly = parseRandToMinorUnits(editMonthly);
    if (!editName.trim() || monthly == null || monthly <= 0) return;
    const target =
      goal.type === "savings" ? parseRandToMinorUnits(editTarget) : null;
    if (goal.type === "savings" && (target == null || target <= 0)) return;
    let aprPayload: number | null | undefined = undefined;
    if (goal.type === "credit") {
      if (!editApr.trim()) aprPayload = null;
      else {
        const n = parseFloat(editApr.replace(",", "."));
        if (!Number.isFinite(n) || n < 0) return;
        aprPayload = n;
      }
    }
    startTransition(async () => {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          targetAmount: goal.type === "savings" ? target : undefined,
          monthlyTarget: monthly,
          apr: aprPayload,
          strategy: goal.type === "credit" ? (editStrategy || null) : undefined,
        }),
      });
      if (res.ok) {
        setDialog(null);
        toast.success("Goal updated.");
        onDone();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to update goal.");
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const res = await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
      if (res.ok) {
        setDialog(null);
        toast.success("Goal deleted.");
        onDone();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to delete goal.");
      }
    });
  };

  return (
    <section className="rounded-xl border-2 border-solid bg-card p-4 shadow-sm" aria-label="Actions">
      <h2 className="text-sm font-medium text-muted-foreground">Controls</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {goal.type === "savings" && goal.linkedAccountId != null && (
          <>
            <Button type="button" size="sm" onClick={() => open("contribute")}>
              Contribute
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => open("withdraw")}>
              Withdraw
            </Button>
          </>
        )}
        {goal.type === "savings" && goal.linkedAccountId == null && (
          <p className="text-xs text-muted-foreground">Link an account to enable contribute and withdraw.</p>
        )}
        {goal.type === "credit" && (
          <>
            <Button type="button" size="sm" onClick={() => open("pay")}>
              Make payment
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => open("interest")}>
              Add interest
            </Button>
          </>
        )}
        <Button type="button" size="sm" variant="secondary" onClick={() => open("edit")}>
          Edit goal
        </Button>
        <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => open("delete")}>
          Delete
        </Button>
      </div>

      <Dialog open={dialog === "contribute"} onOpenChange={(o) => !o && setDialog(null)}>
        <div className="p-1">
          <DialogHeader>Contribute</DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label>From account</Label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
              >
                <option value="">Select</option>
                {bankLike.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {a.name} ({a.type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Amount (R)</Label>
              <Input className="mt-1" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Date</Label>
              <Input className="mt-1" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Input className="mt-1" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <Button disabled={isPending} onClick={handleContribute}>
              Submit
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={dialog === "withdraw"} onOpenChange={(o) => !o && setDialog(null)}>
        <div className="p-1">
          <DialogHeader>Withdraw</DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label>To account</Label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
              >
                <option value="">Select</option>
                {bankLike.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {a.name} ({a.type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Amount (R)</Label>
              <Input className="mt-1" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Date</Label>
              <Input className="mt-1" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
            </div>
            <Button disabled={isPending} onClick={handleWithdraw}>
              Submit
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={dialog === "pay"} onOpenChange={(o) => !o && setDialog(null)}>
        <div className="p-1">
          <DialogHeader>Make payment</DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label>From account</Label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
              >
                <option value="">Select</option>
                {bankLike.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {a.name} ({a.type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Amount (R)</Label>
              <Input className="mt-1" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Date</Label>
              <Input className="mt-1" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
            </div>
            <Button disabled={isPending} onClick={handlePay}>
              Submit
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={dialog === "interest"} onOpenChange={(o) => !o && setDialog(null)}>
        <div className="p-1">
          <DialogHeader>Add interest</DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label>Amount (R)</Label>
              <Input className="mt-1" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Date</Label>
              <Input className="mt-1" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
            </div>
            <Button disabled={isPending} onClick={handleInterest}>
              Submit
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={dialog === "edit"} onOpenChange={(o) => !o && setDialog(null)}>
        <div className="p-1">
          <DialogHeader>Edit goal</DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label>Name</Label>
              <Input className="mt-1" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            {goal.type === "savings" && (
              <div>
                <Label>Target amount (R)</Label>
                <Input className="mt-1" inputMode="decimal" value={editTarget} onChange={(e) => setEditTarget(e.target.value)} />
              </div>
            )}
            <div>
              <Label>Monthly target / plan payment (R)</Label>
              <Input className="mt-1" inputMode="decimal" value={editMonthly} onChange={(e) => setEditMonthly(e.target.value)} />
            </div>
            {goal.type === "credit" && (
              <>
                <div>
                  <Label>APR (e.g. 0.18 for 18%)</Label>
                  <Input className="mt-1" value={editApr} onChange={(e) => setEditApr(e.target.value)} />
                </div>
                <div>
                  <Label>Strategy</Label>
                  <select
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editStrategy}
                    onChange={(e) => setEditStrategy(e.target.value)}
                  >
                    <option value="">None</option>
                    <option value="avalanche">Avalanche</option>
                    <option value="snowball">Snowball</option>
                    <option value="target_date">Target date</option>
                  </select>
                </div>
              </>
            )}
            <Button disabled={isPending} onClick={handleEdit}>
              Save
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={dialog === "delete"} onOpenChange={(o) => !o && setDialog(null)}>
        <div className="p-1">
          <DialogHeader>Delete goal</DialogHeader>
          <p className="text-sm text-muted-foreground">This cannot be undone.</p>
          <div className="flex gap-2 pt-2">
            <Button variant="destructive" disabled={isPending} onClick={handleDelete}>
              Delete
            </Button>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  );
}
