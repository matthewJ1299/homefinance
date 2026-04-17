"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addIncome } from "@/lib/actions/income.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toMinorUnits } from "@/lib/utils/currency";
import type { AccountType, IncomeType } from "@/lib/types";
import { parseAccountsApiPayload } from "@/lib/utils/accounts-api";
import { toast } from "sonner";

interface IncomeQuickAddProps {
  defaultDate: string;
}

export function IncomeQuickAdd({ defaultDate }: IncomeQuickAddProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<IncomeType>("salary");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [primaryAccountId, setPrimaryAccountId] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<Array<{ id: number; name: string; type: AccountType }>>([]);
  const [accountsReady, setAccountsReady] = useState(false);
  const [message, setMessage] = useState<"saved" | "error" | null>(null);

  useEffect(() => {
    setDate(defaultDate);
  }, [defaultDate]);

  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        const { accounts: list, primaryAccountId: primary } = parseAccountsApiPayload(data);
        setAccounts(list);
        setPrimaryAccountId(primary);
      })
      .catch(() => {
        setAccounts([]);
        setPrimaryAccountId(null);
      })
      .finally(() => setAccountsReady(true));
  }, []);

  useEffect(() => {
    if (accounts.length === 0) {
      setAccountId(null);
      return;
    }
    const fallback = primaryAccountId ?? accounts[0]!.id;
    setAccountId((prev) =>
      prev != null && accounts.some((a) => a.id === prev) ? prev : fallback
    );
  }, [accounts, primaryAccountId]);

  const effectiveAccountId =
    accounts.length === 0 ? undefined : (accountId ?? primaryAccountId ?? accounts[0]?.id ?? undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountsReady) return;
    const parsed = parseFloat(amount.replace(/\s/g, "").replace(",", "."));
    if (Number.isNaN(parsed) || parsed <= 0) return;
    if (accounts.length > 0 && effectiveAccountId == null) return;
    const cents = toMinorUnits(parsed);
    startTransition(async () => {
      const result = await addIncome({
        amount: cents,
        type,
        description: description.trim() || undefined,
        date,
        accountId: effectiveAccountId,
      });
      if (result.success) {
        setAmount("");
        setType("salary");
        setDescription("");
        setDate(defaultDate);
        setMessage("saved");
        setTimeout(() => setMessage(null), 2000);
        toast.success("Income added.");
        void router.refresh();
      } else {
        setMessage("error");
        setTimeout(() => setMessage(null), 3000);
        toast.error(result.error);
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
        <Button
          type="submit"
          disabled={isPending || !accountsReady || (accounts.length > 0 && effectiveAccountId == null)}
        >
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
      <div>
        <Label className="text-xs block mb-1">Type</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType("salary")}
            className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              type === "salary" ? "border-primary bg-primary text-primary-foreground" : "border-input"
            }`}
          >
            Salary
          </button>
          <button
            type="button"
            onClick={() => setType("ad_hoc")}
            className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              type === "ad_hoc" ? "border-primary bg-primary text-primary-foreground" : "border-input"
            }`}
          >
            Other income
          </button>
        </div>
      </div>
      <Input
        type="text"
        placeholder={type === "salary" ? "Description (optional)" : "e.g. Bonus"}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="text-sm"
      />
      {accounts.length > 0 && (
        <div>
          <Label className="text-xs block mb-1">Account</Label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={String(accountId ?? primaryAccountId ?? accounts[0]!.id)}
            onChange={(e) => setAccountId(Number(e.target.value))}
          >
            {accounts.map((a) => (
              <option key={a.id} value={String(a.id)}>
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
