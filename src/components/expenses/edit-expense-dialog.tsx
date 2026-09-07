"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ExpenseWithDetails } from "@/lib/types";
import type { Category } from "@/lib/types";
import { updateExpense } from "@/lib/actions/expense.actions";
import { fromMinorUnits, toMinorUnits, formatRand } from "@/lib/utils/currency";
import { CategoryPicker } from "./category-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type SplitType = "equal" | "full" | "exact";

interface EditExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: ExpenseWithDetails;
  allocations?: Array<{ userId: number; userName: string; amount: number }>;
  categories: Category[];
  otherUserName?: string;
  onOptimisticUpsertExpense?: (next: ExpenseWithDetails) => () => void;
}

function inferSplitType(
  totalCents: number,
  allocations: Array<{ amount: number }>
): SplitType {
  const otherShare = allocations.reduce((s, a) => s + a.amount, 0);
  const myShare = totalCents - otherShare;
  if (otherShare <= 0) return "full";
  if (myShare === otherShare) return "equal";
  return "exact";
}

export function EditExpenseDialog({
  open,
  onOpenChange,
  expense,
  allocations = [],
  categories,
  otherUserName,
  onOptimisticUpsertExpense,
}: EditExpenseDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [categoryId, setCategoryId] = useState(expense.categoryId);
  const [amountRand, setAmountRand] = useState("");
  const [note, setNote] = useState(expense.note ?? "");
  const [date, setDate] = useState(expense.date);
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [myShareRand, setMyShareRand] = useState("");
  const [otherShareRand, setOtherShareRand] = useState("");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const isSplit = Boolean(expense.splitGroupId);
  const parseShareCents = (value: string): number =>
    toMinorUnits(parseFloat(value.replace(/\s/g, "").replace(",", ".")) || 0);

  useEffect(() => {
    if (!open) return;
    setCategoryId(expense.categoryId);
    setAmountRand(fromMinorUnits(expense.amount).toFixed(2));
    setNote(expense.note ?? "");
    setDate(expense.date);
    setErrorDetail(null);
    if (isSplit && allocations.length > 0) {
      const inferred = inferSplitType(expense.amount, allocations);
      setSplitType(inferred);
      const otherShare = allocations.reduce((s, a) => s + a.amount, 0);
      const myShare = expense.amount - otherShare;
      setMyShareRand(fromMinorUnits(myShare).toFixed(2));
      setOtherShareRand(fromMinorUnits(otherShare).toFixed(2));
    } else if (isSplit) {
      setSplitType("equal");
      setMyShareRand(fromMinorUnits(Math.floor(expense.amount / 2)).toFixed(2));
      setOtherShareRand(fromMinorUnits(Math.floor(expense.amount / 2)).toFixed(2));
    }
  }, [open, expense, allocations, isSplit]);

  const handleSubmit = () => {
    const totalCents = toMinorUnits(parseFloat(amountRand.replace(/\s/g, "").replace(",", ".")) || 0);
    if (totalCents <= 0) {
      setErrorDetail("Enter a valid amount.");
      return;
    }
    if (isSplit && splitType === "exact") {
      const myCents = parseShareCents(myShareRand);
      const otherCents = parseShareCents(otherShareRand);
      if (myCents + otherCents !== totalCents) {
        setErrorDetail("My share + other share must equal total amount.");
        return;
      }
    }

    startTransition(async () => {
      const categoryName = categories.find((c) => c.id === categoryId)?.name ?? expense.categoryName;
      const optimisticNext: ExpenseWithDetails = {
        ...expense,
        categoryId,
        categoryName,
        amount: totalCents,
        note: note.trim() || null,
        date,
      };
      const rollback = onOptimisticUpsertExpense?.(optimisticNext);

      const payload: {
        categoryId: number;
        amount: number;
        note: string | null;
        date: string;
        splitType?: SplitType;
        myShareCents?: number;
        otherShareCents?: number;
      } = {
        categoryId,
        amount: totalCents,
        note: note.trim() || null,
        date,
      };
      if (isSplit) {
        payload.splitType = splitType;
        if (splitType === "exact") {
          payload.myShareCents = parseShareCents(myShareRand);
          payload.otherShareCents = parseShareCents(otherShareRand);
        }
      }
      const result = await updateExpense(expense.id, payload);
      if (result.success) {
        onOpenChange(false);
        toast.success("Expense updated.");
        void router.refresh();
      } else {
        rollback?.();
        setErrorDetail(result.error);
        toast.error(result.error);
      }
    });
  };

  const totalCentsForExact =
    toMinorUnits(parseFloat(amountRand.replace(/\s/g, "").replace(",", ".")) || 0);
  const myCentsExact = parseShareCents(myShareRand);
  const otherCentsExact = parseShareCents(otherShareRand);
  const exactRemainingCents = totalCentsForExact - myCentsExact - otherCentsExact;
  const exactValid = !isSplit || splitType !== "exact" || myCentsExact + otherCentsExact === totalCentsForExact;
  const otherLabel = otherUserName ? `${otherUserName}'s share (R)` : "Other share (R)";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>Edit expense</DialogHeader>
      <div className="space-y-3">
        <div>
          <span className="text-xs text-muted-foreground block mb-1">Category</span>
          <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />
        </div>
        <div>
          <Label htmlFor="edit-amount" className="text-xs text-muted-foreground block mb-1">
            Amount (R)
          </Label>
          <Input
            id="edit-amount"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amountRand}
            onChange={(e) => setAmountRand(e.target.value)}
            className="text-sm"
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
          <Label htmlFor="edit-date" className="text-xs text-muted-foreground block mb-1">
            Date
          </Label>
          <Input
            id="edit-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-sm"
          />
        </div>
        {isSplit && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground">Split</p>
            <div className="space-y-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="edit-splitType"
                  checked={splitType === "equal"}
                  onChange={() => setSplitType("equal")}
                />
                <span className="text-sm">Split equally</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="edit-splitType"
                  checked={splitType === "full"}
                  onChange={() => setSplitType("full")}
                />
                <span className="text-sm">I am owed the full amount</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="edit-splitType"
                  checked={splitType === "exact"}
                  onChange={() => setSplitType("exact")}
                />
                <span className="text-sm">Split by exact amount</span>
              </label>
            </div>
            {splitType === "exact" && (
              <div className="space-y-2 pt-1">
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
                    <Label className="text-xs">{otherLabel}</Label>
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
                <p
                  className={`text-xs ${
                    exactRemainingCents < 0 ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {exactRemainingCents > 0
                    ? `Left to give a job: ${formatRand(exactRemainingCents)}`
                    : exactRemainingCents < 0
                      ? `You've promised ${formatRand(Math.abs(exactRemainingCents))} more than you have`
                      : "Every rand has a job."}
                </p>
              </div>
            )}
          </div>
        )}
        {errorDetail && <p className="text-sm text-destructive">{errorDetail}</p>}
      </div>
      <DialogFooter className="justify-between">
        <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || !categoryId || totalCentsForExact <= 0 || !exactValid}
        >
          {isPending ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
