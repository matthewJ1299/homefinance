"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createRecurringIncome,
  updateRecurringIncome,
  deleteRecurringIncome,
} from "@/lib/actions/recurring-income.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRand } from "@/lib/utils/currency";
import type { RecurringIncome } from "@/lib/types";
import { usePropSyncedState } from "@/hooks/use-prop-synced-state";
import { toast } from "sonner";

interface RecurringIncomeManageProps {
  items: RecurringIncome[];
}

export function RecurringIncomeManage({ items }: RecurringIncomeManageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<"saved" | "error" | null>(null);
  const [errorText, setErrorText] = useState("");
  const [amountRands, setAmountRands] = useState("");
  const [type, setType] = useState<"salary" | "ad_hoc">("salary");
  const [description, setDescription] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAmountRands, setEditAmountRands] = useState("");
  const [editType, setEditType] = useState<"salary" | "ad_hoc">("salary");
  const [editDescription, setEditDescription] = useState("");
  const [editDayOfMonth, setEditDayOfMonth] = useState("1");
  const [itemsState, setItemsState] = usePropSyncedState(items);

  const toCents = (r: string) => Math.round(parseFloat(r.replace(/\s/g, "").replace(",", ".")) * 100) || 0;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cents = toCents(amountRands);
    if (cents <= 0) {
      setErrorText("Enter a valid amount.");
      setMessage("error");
      return;
    }
    const day = parseInt(dayOfMonth, 10);
    if (Number.isNaN(day) || day < 1 || day > 31) {
      setErrorText("Day must be 1-31.");
      setMessage("error");
      return;
    }
    setErrorText("");
    const tempId = -Date.now();
    const snapshot = itemsState;
    setItemsState((prev) => [
      ...prev,
      {
        id: tempId,
        userId: prev[0]?.userId ?? 0,
        amount: cents,
        type,
        description: description.trim() || null,
        dayOfMonth: day,
      },
    ]);
    startTransition(async () => {
      const result = await createRecurringIncome({
        amount: cents,
        type,
        description: description.trim() || null,
        dayOfMonth: day,
      });
      if (result.success) {
        setAmountRands("");
        setDescription("");
        setDayOfMonth("1");
        setMessage("saved");
        setTimeout(() => setMessage(null), 2000);
        if (result.id != null) {
          setItemsState((prev) => prev.map((i) => (i.id === tempId ? { ...i, id: result.id! } : i)));
        }
        toast.success("Recurring income created.");
        void router.refresh();
      } else {
        setItemsState(snapshot);
        setErrorText(result.error);
        setMessage("error");
        toast.error(result.error);
      }
    });
  };

  const startEdit = (item: RecurringIncome) => {
    setEditingId(item.id);
    setEditAmountRands((item.amount / 100).toFixed(2));
    setEditType(item.type);
    setEditDescription(item.description ?? "");
    setEditDayOfMonth(String(item.dayOfMonth));
  };

  const handleSaveEdit = () => {
    if (editingId === null) return;
    const cents = toCents(editAmountRands);
    if (cents <= 0) {
      setErrorText("Enter a valid amount.");
      return;
    }
    const day = parseInt(editDayOfMonth, 10);
    if (Number.isNaN(day) || day < 1 || day > 31) {
      setErrorText("Day must be 1-31.");
      return;
    }
    setErrorText("");
    const snapshot = itemsState;
    setItemsState((prev) =>
      prev.map((i) =>
        i.id === editingId
          ? { ...i, amount: cents, type: editType, description: editDescription.trim() || null, dayOfMonth: day }
          : i
      )
    );
    startTransition(async () => {
      const result = await updateRecurringIncome(editingId, {
        amount: cents,
        type: editType,
        description: editDescription.trim() || null,
        dayOfMonth: day,
      });
      if (result.success) {
        setEditingId(null);
        setMessage("saved");
        setTimeout(() => setMessage(null), 2000);
        toast.success("Recurring income updated.");
        void router.refresh();
      } else {
        setItemsState(snapshot);
        setErrorText(result.error);
        setMessage("error");
        toast.error(result.error);
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this recurring income?")) return;
    const snapshot = itemsState;
    setItemsState((prev) => prev.filter((i) => i.id !== id));
    startTransition(async () => {
      const result = await deleteRecurringIncome(id);
      if (result.success) {
        if (editingId === id) setEditingId(null);
        toast.success("Recurring income deleted.");
        void router.refresh();
      } else {
        setItemsState(snapshot);
        setErrorText(result.error);
        setMessage("error");
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-medium text-sm text-muted-foreground mb-3">Add recurring income</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
          <div className="min-w-[100px]">
            <Label className="text-xs">Amount (R)</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={amountRands}
              onChange={(e) => setAmountRands(e.target.value)}
              placeholder="0.00"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Type</Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "salary" | "ad_hoc")}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm mt-1 block"
            >
              <option value="salary">Salary</option>
              <option value="ad_hoc">Ad hoc</option>
            </select>
          </div>
          <div className="min-w-[120px]">
            <Label className="text-xs">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              className="mt-1"
            />
          </div>
          <div className="w-20">
            <Label className="text-xs">Day (1-31)</Label>
            <Input
              type="number"
              min={1}
              max={31}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button type="submit" disabled={isPending}>Add</Button>
        </form>
      </section>

      {message === "saved" && <p className="text-sm text-primary font-medium">Saved.</p>}
      {message === "error" && errorText && <p className="text-sm text-destructive">{errorText}</p>}

      <section>
        <h2 className="font-medium text-sm text-muted-foreground mb-3">Templates</h2>
        {itemsState.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recurring income yet.</p>
        ) : (
          <ul className="space-y-2">
            {itemsState.map((item) => (
              <li key={item.id} className="rounded-lg border bg-card p-3 text-sm flex items-center justify-between gap-2 flex-wrap">
                {editingId === item.id ? (
                  <>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={editAmountRands}
                      onChange={(e) => setEditAmountRands(e.target.value)}
                      className="w-24"
                    />
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as "salary" | "ad_hoc")}
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="salary">Salary</option>
                      <option value="ad_hoc">Ad hoc</option>
                    </select>
                    <Input
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="flex-1 min-w-[100px]"
                    />
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={editDayOfMonth}
                      onChange={(e) => setEditDayOfMonth(e.target.value)}
                      className="w-16"
                    />
                    <Button size="sm" onClick={handleSaveEdit} disabled={isPending}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)} disabled={isPending}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <span className="font-medium">{formatRand(item.amount)}</span>
                    <span className="text-muted-foreground">{item.type}</span>
                    {item.description && <span className="text-muted-foreground">{item.description}</span>}
                    <span className="text-muted-foreground text-xs">Day {item.dayOfMonth}</span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => startEdit(item)} disabled={isPending}>Edit</Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(item.id)} disabled={isPending}>Delete</Button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
