"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/lib/types";
import { addExpense } from "@/lib/actions/expense.actions";
import { useOfflineQueue } from "@/hooks/use-offline-queue";
import { CategoryPicker } from "./category-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { toMinorUnits } from "@/lib/utils/currency";

interface QuickAddFormProps {
  categories: Category[];
  userId: number;
}

export function QuickAddForm({ categories, userId }: QuickAddFormProps) {
  const router = useRouter();
  const { isOnline, addToQueue, syncQueue } = useOfflineQueue();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [pendingCents, setPendingCents] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(categories[0]?.id ?? null);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [message, setMessage] = useState<"saved" | "saved_offline" | "error" | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  useEffect(() => {
    if (!isOnline) return;
    syncQueue().then(() => router.refresh());
  }, [isOnline, syncQueue, router]);

  const openCategoryDialog = () => {
    const parsed = parseFloat(amount.replace(/\s/g, "").replace(",", "."));
    if (Number.isNaN(parsed) || parsed <= 0) return;
    setPendingCents(toMinorUnits(parsed));
    setCategoryId(categories[0]?.id ?? null);
    setNote("");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setCategoryDialogOpen(true);
  };

  const handleConfirmCategory = () => {
    if (pendingCents === null || !categoryId) return;

    if (!isOnline) {
      addToQueue({
        tempId: crypto.randomUUID(),
        categoryId,
        amount: pendingCents,
        note: note.trim() || undefined,
        date,
      });
      setMessage("saved_offline");
      setTimeout(() => setMessage(null), 3000);
      setAmount("");
      setCategoryDialogOpen(false);
      setPendingCents(null);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50);
      }
      return;
    }

    startTransition(async () => {
      const result = await addExpense({
        categoryId,
        amount: pendingCents,
        note: note.trim() || undefined,
        date,
      });
      if (result.success) {
        setAmount("");
        setMessage("saved");
        setErrorDetail(null);
        setTimeout(() => setMessage(null), 2000);
        setCategoryDialogOpen(false);
        setPendingCents(null);
        router.refresh();
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(50);
        }
      } else {
        setMessage("error");
        setErrorDetail("error" in result ? result.error : null);
        setTimeout(() => {
          setMessage(null);
          setErrorDetail(null);
        }, 5000);
      }
    });
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1 min-w-0">
            <label htmlFor="quick-amount" className="text-xs text-muted-foreground block mb-1">
              Amount (R)
            </label>
            <Input
              id="quick-amount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  openCategoryDialog();
                }
              }}
              className="text-lg"
            />
          </div>
          <Button
            type="button"
            onClick={openCategoryDialog}
            disabled={(() => {
              const parsed = parseFloat(amount.replace(/\s/g, "").replace(",", "."));
              return Number.isNaN(parsed) || parsed <= 0;
            })()}
          >
            Add
          </Button>
        </div>
        {message === "saved" && (
          <p className="text-sm text-primary font-medium">Saved.</p>
        )}
        {message === "saved_offline" && (
          <p className="text-sm text-muted-foreground">Saved offline. Will sync when back online.</p>
        )}
        {message === "error" && (
          <p className="text-sm text-destructive">
            {errorDetail ?? "Failed to save. Try again."}
          </p>
        )}
      </div>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogHeader>Choose category</DialogHeader>
        <div className="space-y-3">
          <div>
            <span className="text-xs text-muted-foreground block mb-1">Category</span>
            <CategoryPicker
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
            />
          </div>
          <div>
            <Input
              type="text"
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label htmlFor="expense-date" className="text-xs text-muted-foreground block mb-1">
              Date
            </label>
            <Input
              id="expense-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>
        <DialogFooter className="justify-between">
          <Button variant="outline" type="button" onClick={() => setCategoryDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirmCategory}
            disabled={isPending || !categoryId}
          >
            {isPending ? "Adding..." : "Add expense"}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
