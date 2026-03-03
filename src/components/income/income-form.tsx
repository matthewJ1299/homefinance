"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addIncome } from "@/lib/actions/income.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { toMinorUnits } from "@/lib/utils/currency";
import type { IncomeType } from "@/lib/types";

export function IncomeForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<IncomeType>("salary");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [message, setMessage] = useState<"saved" | "error" | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount.replace(/\s/g, "").replace(",", "."));
    if (Number.isNaN(parsed) || parsed <= 0) return;
    const cents = toMinorUnits(parsed);
    startTransition(async () => {
      const result = await addIncome({
        amount: cents,
        type,
        description: description.trim() || undefined,
        date,
      });
      if (result.success) {
        setAmount("");
        setDescription("");
        setDate(format(new Date(), "yyyy-MM-dd"));
        setMessage("saved");
        setTimeout(() => setMessage(null), 2000);
        router.refresh();
      } else {
        setMessage("error");
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="income-amount">Amount (R)</Label>
        <Input
          id="income-amount"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label>Type</Label>
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={() => setType("salary")}
            className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
              type === "salary" ? "bg-primary text-primary-foreground border-primary" : "border-input"
            }`}
          >
            Salary
          </button>
          <button
            type="button"
            onClick={() => setType("ad_hoc")}
            className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
              type === "ad_hoc" ? "bg-primary text-primary-foreground border-primary" : "border-input"
            }`}
          >
            Ad hoc
          </button>
        </div>
      </div>
      <div>
        <Label htmlFor="income-date">Date</Label>
        <Input
          id="income-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="income-desc">Description (optional)</Label>
        <Input
          id="income-desc"
          type="text"
          placeholder="e.g. Bonus"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1"
        />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Adding..." : "Add income"}
      </Button>
      {message === "saved" && <p className="text-sm text-primary font-medium">Saved.</p>}
      {message === "error" && <p className="text-sm text-destructive">Failed to save.</p>}
    </form>
  );
}
