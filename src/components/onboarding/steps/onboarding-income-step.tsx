"use client";

import { useEffect, useState, useTransition } from "react";
import { addIncome } from "@/lib/actions/income.actions";
import { createRecurringIncome } from "@/lib/actions/recurring-income.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toMinorUnits } from "@/lib/utils/currency";
import { parseAccountsApiPayload } from "@/lib/utils/accounts-api";
import { toast } from "sonner";

export function OnboardingIncomeStep(props: {
  defaultDate: string;
  paydayDay: number;
  onIncomeAdded: () => void;
}) {
  const { defaultDate, paydayDay, onIncomeAdded } = props;
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [makeRecurring, setMakeRecurring] = useState(true);
  const [hasIncome, setHasIncome] = useState(false);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [accountsReady, setAccountsReady] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDate(defaultDate);
  }, [defaultDate]);

  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        const { accounts: list, primaryAccountId: primary } = parseAccountsApiPayload(data);
        setAccountId(primary ?? list[0]?.id ?? null);
      })
      .finally(() => setAccountsReady(true));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount.replace(/\s/g, "").replace(",", "."));
    if (Number.isNaN(parsed) || parsed <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    const cents = toMinorUnits(parsed);

    startTransition(async () => {
      const result = await addIncome({
        amount: cents,
        type: "salary",
        description: "Monthly income",
        date,
        accountId: accountId ?? undefined,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      if (makeRecurring) {
        const recurring = await createRecurringIncome({
          amount: cents,
          type: "salary",
          description: "Monthly income",
          dayOfMonth: paydayDay,
        });
        if (!recurring.success) {
          toast.error(recurring.error);
        }
      }

      setHasIncome(true);
      setAmount("");
      toast.success("Income added.");
      onIncomeAdded();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div className="space-y-1.5">
        <Label htmlFor="onboarding-income-amount">Monthly amount (R)</Label>
        <Input
          id="onboarding-income-amount"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="text-lg"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="onboarding-income-date">Payday this month</Label>
        <Input
          id="onboarding-income-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={makeRecurring}
          onChange={(e) => setMakeRecurring(e.target.checked)}
          className="rounded border-input"
        />
        <span>Repeat this income every month on my payday</span>
      </label>
      <Button
        type="submit"
        disabled={isPending || !accountsReady || amount.trim() === ""}
      >
        {isPending ? "Saving…" : hasIncome ? "Add another" : "Add income"}
      </Button>
      {hasIncome ? (
        <p className="text-xs text-muted-foreground">Income saved. You can add more or continue.</p>
      ) : null}
    </form>
  );
}
