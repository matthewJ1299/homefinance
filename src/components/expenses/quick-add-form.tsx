"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/lib/types";
import { addExpense, addSplitExpense } from "@/lib/actions/expense.actions";
import { useOfflineQueue } from "@/hooks/use-offline-queue";
import { CategoryPicker } from "./category-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { toMinorUnits } from "@/lib/utils/currency";

type SplitType = "equal" | "full" | "exact";

interface QuickAddFormProps {
  categories: Category[];
  userId: number;
  otherUserName?: string;
}

export function QuickAddForm({ categories, userId, otherUserName }: QuickAddFormProps) {
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
  const [warningDetail, setWarningDetail] = useState<string | null>(null);
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [myShareRand, setMyShareRand] = useState("");
  const [otherShareRand, setOtherShareRand] = useState("");

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
    setSplitEnabled(false);
    setSplitType("equal");
    setMyShareRand("");
    setOtherShareRand("");
    setErrorDetail(null);
    setCategoryDialogOpen(true);
  };

  const handleConfirmCategory = () => {
    if (pendingCents === null || !categoryId) return;

    if (splitEnabled && pendingCents > 0) {
      if (splitType === "exact") {
        const myCents = toMinorUnits(parseFloat(myShareRand.replace(/\s/g, "").replace(",", ".")) || 0);
        const otherCents = toMinorUnits(parseFloat(otherShareRand.replace(/\s/g, "").replace(",", ".")) || 0);
        if (myCents + otherCents !== pendingCents) {
          setErrorDetail("My share + other share must equal total amount.");
          setTimeout(() => setErrorDetail(null), 5000);
          return;
        }
      }
    }

    if (!isOnline) {
      if (splitEnabled) return;
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
      if (splitEnabled) {
        const result = await addSplitExpense({
          categoryId,
          totalAmountCents: pendingCents,
          note: note.trim() || undefined,
          date,
          splitType,
          ...(splitType === "exact" && {
            myShareCents: toMinorUnits(parseFloat(myShareRand.replace(/\s/g, "").replace(",", ".")) || 0),
            otherShareCents: toMinorUnits(parseFloat(otherShareRand.replace(/\s/g, "").replace(",", ".")) || 0),
          }),
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
        return;
      }
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
        setWarningDetail(result.warning ?? null);
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
        {message === "saved" && !categoryDialogOpen && (
          <p className="text-sm text-primary font-medium">Saved.</p>
        )}
        {message === "saved_offline" && (
          <p className="text-sm text-muted-foreground">Saved offline. Will sync when back online.</p>
        )}
        {message === "error" && !categoryDialogOpen && (
          <p className="text-sm text-destructive">
            {errorDetail ?? "Failed to save. Try again."}
          </p>
        )}
      </div>

      <Dialog
        open={categoryDialogOpen}
        onOpenChange={(open) => {
          setCategoryDialogOpen(open);
          if (!open) {
            setMessage(null);
            setErrorDetail(null);
            setWarningDetail(null);
          }
        }}
      >
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
            <Label htmlFor="expense-date" className="text-xs text-muted-foreground block mb-1">
              Date
            </Label>
            <Input
              id="expense-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-sm"
            />
          </div>
          {isOnline && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={splitEnabled}
                  onChange={(e) => setSplitEnabled(e.target.checked)}
                  className="rounded border-input"
                />
                <span className="text-sm">Split this expense</span>
              </label>
              {splitEnabled && (
                <div className="pl-6 space-y-2 border-l-2 border-muted">
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="splitType"
                        checked={splitType === "equal"}
                        onChange={() => setSplitType("equal")}
                      />
                      <span className="text-sm">I paid, split equally</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="splitType"
                        checked={splitType === "full"}
                        onChange={() => setSplitType("full")}
                      />
                      <span className="text-sm">I am owed the full amount</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="splitType"
                        checked={splitType === "exact"}
                        onChange={() => setSplitType("exact")}
                      />
                      <span className="text-sm">Split by exact amount</span>
                    </label>
                  </div>
                  {splitType === "exact" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">My share (R)</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={myShareRand}
                          onChange={(e) => setMyShareRand(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{otherUserName ? `${otherUserName}'s share (R)` : "Other share (R)"}</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={otherShareRand}
                          onChange={(e) => setOtherShareRand(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {warningDetail && (
            <p className="text-sm text-amber-600 dark:text-amber-500">{warningDetail}</p>
          )}
          {errorDetail && (
            <p className="text-sm text-destructive">{errorDetail}</p>
          )}
        </div>
        <DialogFooter className="justify-between">
          <Button variant="outline" type="button" onClick={() => setCategoryDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirmCategory}
            disabled={
              isPending ||
              !categoryId ||
              (splitEnabled && splitType === "exact" && (!myShareRand || !otherShareRand))
            }
          >
            {isPending ? "Adding..." : "Add expense"}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
