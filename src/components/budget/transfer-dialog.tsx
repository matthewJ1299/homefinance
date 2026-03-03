"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { transferBudgetFunds } from "@/lib/actions/budget.actions";
import { formatRand } from "@/lib/utils/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toMinorUnits } from "@/lib/utils/currency";

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromCategoryId: number;
  fromCategoryName: string;
  overspentAmount: number;
  categories: { categoryId: number; categoryName: string; remaining: number }[];
  month: string;
}

export function TransferDialog({
  open,
  onOpenChange,
  fromCategoryId,
  fromCategoryName,
  overspentAmount,
  categories,
  month,
}: TransferDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toCategoryId, setToCategoryId] = useState<number>(categories[0]?.categoryId ?? 0);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sourceOptions = categories.filter((c) => c.categoryId !== fromCategoryId && c.remaining > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const rands = parseFloat(amount.replace(/\s/g, "").replace(",", "."));
    if (Number.isNaN(rands) || rands <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    const cents = toMinorUnits(rands);
    const toCat = categories.find((c) => c.categoryId === toCategoryId);
    if (!toCat || toCat.remaining < cents) {
      setError("Source category has insufficient funds.");
      return;
    }
    startTransition(async () => {
      const result = await transferBudgetFunds({
        fromCategoryId: toCategoryId,
        toCategoryId: fromCategoryId,
        month,
        amount: cents,
        reason: reason.trim() || undefined,
      });
      if (result.success) {
        onOpenChange(false);
        setAmount("");
        setReason("");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-background rounded-lg shadow-lg max-w-md w-full p-6">
        <h3 className="font-semibold text-lg mb-2">Move money to {fromCategoryName}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Pull from another category to cover the overage ({formatRand(overspentAmount)}).
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>From category</Label>
            <select
              value={toCategoryId}
              onChange={(e) => setToCategoryId(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {sourceOptions.map((c) => (
                <option key={c.categoryId} value={c.categoryId}>
                  {c.categoryName} ({formatRand(c.remaining)} left)
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="transfer-amount">Amount (R)</Label>
            <Input
              id="transfer-amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="transfer-reason">Reason (optional)</Label>
            <Input
              id="transfer-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Moving..." : "Move"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
