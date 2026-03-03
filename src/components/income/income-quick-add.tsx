"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { addIncome } from "@/lib/actions/income.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toMinorUnits } from "@/lib/utils/currency";

interface IncomeQuickAddProps {
  month: string;
}

export function IncomeQuickAdd({ month }: IncomeQuickAddProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
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
        type: "salary",
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
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2 items-end">
        <div className="flex-1 min-w-0">
          <label htmlFor="income-amount-dash" className="text-xs text-muted-foreground block mb-1">
            Income this month (R)
          </label>
          <Input
            id="income-amount-dash"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-lg"
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Add"}
        </Button>
      </div>
      <div>
        <label htmlFor="income-date-dash" className="text-xs text-muted-foreground block mb-1">
          Date
        </label>
        <Input
          id="income-date-dash"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="text-sm"
        />
      </div>
      <Input
        type="text"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="text-sm"
      />
      {message === "saved" && (
        <p className="text-sm text-primary font-medium">Income saved. You can budget it now.</p>
      )}
      {message === "error" && (
        <p className="text-sm text-destructive">Failed to save. Try again.</p>
      )}
    </form>
  );
}
