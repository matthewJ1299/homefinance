"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { addIncome } from "@/lib/actions/income.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toMinorUnits } from "@/lib/utils/currency";
import type { AccountType } from "@/lib/types";

interface IncomeQuickAddProps {
  month: string;
}

export function IncomeQuickAdd({ month }: IncomeQuickAddProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [accountId, setAccountId] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<Array<{ id: number; name: string; type: AccountType }>>([]);
  const [message, setMessage] = useState<"saved" | "error" | null>(null);

  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => (res.ok ? res.json() : { accounts: [] }))
      .then((data) => setAccounts(data.accounts ?? []));
  }, []);

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
        accountId: accountId ?? undefined,
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
      {accounts.length > 0 && (
        <div>
          <Label className="text-xs block mb-1">Account</Label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={accountId ?? ""}
            onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">None</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.type})
              </option>
            ))}
          </select>
        </div>
      )}
      {message === "saved" && (
        <p className="text-sm text-primary font-medium">Income saved. You can budget it now.</p>
      )}
      {message === "error" && (
        <p className="text-sm text-destructive">Failed to save. Try again.</p>
      )}
    </form>
  );
}
