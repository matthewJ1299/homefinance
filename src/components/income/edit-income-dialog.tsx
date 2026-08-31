"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { IncomeEntry } from "@/lib/repositories/interfaces/income.repository";
import type { IncomeType } from "@/lib/types";
import { updateIncome } from "@/lib/actions/income.actions";
import { fromMinorUnits, toMinorUnits } from "@/lib/utils/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface EditIncomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: IncomeEntry;
}

export function EditIncomeDialog({ open, onOpenChange, entry }: EditIncomeDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amountRand, setAmountRand] = useState("");
  const [type, setType] = useState<IncomeType>("salary");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmountRand(fromMinorUnits(entry.amount).toFixed(2));
    setType(entry.type);
    setDescription(entry.description ?? "");
    setDate(entry.date);
    setErrorDetail(null);
  }, [open, entry]);

  const handleSubmit = () => {
    const parsed = parseFloat(amountRand.replace(/\s/g, "").replace(",", "."));
    if (Number.isNaN(parsed) || parsed <= 0) {
      setErrorDetail("Enter a valid amount.");
      return;
    }
    setErrorDetail(null);
    startTransition(async () => {
      const result = await updateIncome(entry.id, {
        amount: toMinorUnits(parsed),
        type,
        description: description.trim() || null,
        date,
      });
      if (result.success) {
        toast.success("Income updated.");
        onOpenChange(false);
        void router.refresh();
      } else {
        setErrorDetail(result.error);
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>Edit income</DialogHeader>
      <div className="space-y-3">
        <div>
          <Label htmlFor="edit-income-amount">Amount (R)</Label>
          <Input
            id="edit-income-amount"
            type="number"
            step="0.01"
            min="0"
            value={amountRand}
            onChange={(e) => setAmountRand(e.target.value)}
            disabled={isPending}
          />
        </div>
        <div>
          <Label>Type</Label>
          <div className="flex gap-2 mt-1">
            <Button
              type="button"
              variant={type === "salary" ? "default" : "outline"}
              size="sm"
              onClick={() => setType("salary")}
              disabled={isPending}
            >
              Salary
            </Button>
            <Button
              type="button"
              variant={type === "ad_hoc" ? "default" : "outline"}
              size="sm"
              onClick={() => setType("ad_hoc")}
              disabled={isPending}
            >
              Other
            </Button>
          </div>
        </div>
        <div>
          <Label htmlFor="edit-income-description">Description</Label>
          <Input
            id="edit-income-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isPending}
          />
        </div>
        <div>
          <Label htmlFor="edit-income-date">Date</Label>
          <Input
            id="edit-income-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={isPending}
          />
        </div>
        {errorDetail && <p className="text-sm text-destructive">{errorDetail}</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
