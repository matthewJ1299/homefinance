"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
} from "@/lib/actions/recurring-expense.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRand } from "@/lib/utils/currency";
import type { RecurringExpense } from "@/lib/types";
import type { Category } from "@/lib/types";
import { usePropSyncedState } from "@/hooks/use-prop-synced-state";
import { toast } from "sonner";

interface RecurringExpenseManageProps {
  items: RecurringExpense[];
  categories: Category[];
}

export function RecurringExpenseManage({ items, categories }: RecurringExpenseManageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<"saved" | "error" | null>(null);
  const [errorText, setErrorText] = useState("");
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id ?? 0);
  const [amountRands, setAmountRands] = useState("");
  const [note, setNote] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCategoryId, setEditCategoryId] = useState<number>(0);
  const [editAmountRands, setEditAmountRands] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editDayOfMonth, setEditDayOfMonth] = useState("1");
  const [itemsState, setItemsState] = usePropSyncedState(items);

  const toCents = (r: string) => Math.round(parseFloat(r.replace(/\s/g, "").replace(",", ".")) * 100) || 0;
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cents = toCents(amountRands);
    if (cents <= 0) {
      setErrorText("Enter a valid amount.");
      setMessage("error");
      return;
    }
    if (!categoryId) {
      setErrorText("Select a category.");
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
        categoryId,
        amount: cents,
        note: note.trim() || null,
        dayOfMonth: day,
      },
    ]);
    startTransition(async () => {
      const result = await createRecurringExpense({
        categoryId,
        amount: cents,
        note: note.trim() || null,
        dayOfMonth: day,
      });
      if (result.success) {
        setAmountRands("");
        setNote("");
        setDayOfMonth("1");
        setCategoryId(categories[0]?.id ?? 0);
        setMessage("saved");
        setTimeout(() => setMessage(null), 2000);
        if (result.id != null) {
          setItemsState((prev) => prev.map((i) => (i.id === tempId ? { ...i, id: result.id! } : i)));
        }
        toast.success("Recurring expense created.");
        void router.refresh();
      } else {
        setItemsState(snapshot);
        setErrorText(result.error);
        setMessage("error");
        toast.error(result.error);
      }
    });
  };

  const startEdit = (item: RecurringExpense) => {
    setEditingId(item.id);
    setEditCategoryId(item.categoryId);
    setEditAmountRands((item.amount / 100).toFixed(2));
    setEditNote(item.note ?? "");
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
          ? { ...i, categoryId: editCategoryId, amount: cents, note: editNote.trim() || null, dayOfMonth: day }
          : i
      )
    );
    startTransition(async () => {
      const result = await updateRecurringExpense(editingId, {
        categoryId: editCategoryId,
        amount: cents,
        note: editNote.trim() || null,
        dayOfMonth: day,
      });
      if (result.success) {
        setEditingId(null);
        setMessage("saved");
        setTimeout(() => setMessage(null), 2000);
        toast.success("Recurring expense updated.");
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
    if (!confirm("Delete this recurring expense?")) return;
    const snapshot = itemsState;
    setItemsState((prev) => prev.filter((i) => i.id !== id));
    startTransition(async () => {
      const result = await deleteRecurringExpense(id);
      if (result.success) {
        if (editingId === id) setEditingId(null);
        toast.success("Recurring expense deleted.");
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
        <h2 className="font-medium text-sm text-muted-foreground mb-3">Add recurring expense</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
          <div className="min-w-[140px]">
            <Label className="text-xs">Category</Label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm mt-1 block w-full"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
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
          <div className="min-w-[120px]">
            <Label className="text-xs">Note</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
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
          <p className="text-sm text-muted-foreground">No recurring expenses yet.</p>
        ) : (
          <ul className="space-y-2">
            {itemsState.map((item) => (
              <li key={item.id} className="rounded-lg border bg-card p-3 text-sm flex items-center justify-between gap-2 flex-wrap">
                {editingId === item.id ? (
                  <>
                    <select
                      value={editCategoryId}
                      onChange={(e) => setEditCategoryId(Number(e.target.value))}
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm min-w-[120px]"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={editAmountRands}
                      onChange={(e) => setEditAmountRands(e.target.value)}
                      className="w-24"
                    />
                    <Input
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      className="flex-1 min-w-[80px]"
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
                    <span className="text-muted-foreground">{categoryById.get(item.categoryId)?.name ?? item.categoryId}</span>
                    {item.note && <span className="text-muted-foreground truncate max-w-[120px]">{item.note}</span>}
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
