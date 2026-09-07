"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { toMinorUnits } from "@/lib/utils/currency";
import type { AccountType } from "@/lib/types";

interface AccountWithBalance {
  id: number;
  name: string;
  type: AccountType;
  balance: number;
  availableCredit?: number;
}

interface TransferMoneyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountWithBalance[];
  onSuccess?: () => void;
}

export function TransferMoneyModal({
  open,
  onOpenChange,
  accounts,
  onSuccess,
}: TransferMoneyModalProps) {
  const [fromAccountId, setFromAccountId] = useState<number | null>(null);
  const [toAccountId, setToAccountId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const parsed = parseFloat(amount.replace(/\s/g, "").replace(",", "."));
    if (Number.isNaN(parsed) || parsed <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (!fromAccountId || !toAccountId) {
      setError("Select from and to accounts");
      return;
    }
    if (fromAccountId === toAccountId) {
      setError("From and to accounts must be different");
      return;
    }

    const cents = toMinorUnits(parsed);
    setError(null);

    startTransition(async () => {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAccountId,
          toAccountId,
          amount: cents,
          note: note.trim() || null,
        }),
      });

      if (res.ok) {
        setFromAccountId(null);
        setToAccountId(null);
        setAmount("");
        setNote("");
        onOpenChange(false);
        onSuccess?.();
      } else {
        const data = await res.json();
        setError(data.error ?? "Transfer failed");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>Transfer Money</DialogHeader>
      <div className="space-y-3">
        <div>
          <Label htmlFor="transfer-from">From account</Label>
          <select
            id="transfer-from"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
            value={fromAccountId ?? ""}
            onChange={(e) => setFromAccountId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Select...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.type})
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="transfer-to">To account</Label>
          <select
            id="transfer-to"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
            value={toAccountId ?? ""}
            onChange={(e) => setToAccountId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Select...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.type})
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
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="transfer-note">Note (optional)</Label>
          <Input
            id="transfer-note"
            type="text"
            placeholder="e.g. Monthly savings"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Transferring..." : "Transfer"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
