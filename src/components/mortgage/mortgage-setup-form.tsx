"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveMortgageConfig } from "@/lib/actions/mortgage.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toMinorUnits } from "@/lib/utils/currency";
import { fromMinorUnits } from "@/lib/utils/currency";

interface UserOption {
  id: number;
  name: string;
}

export interface MortgageInitialValues {
  propertyValue: string;
  loanAmount: string;
  annualRate: string;
  termYears: string;
  startDate: string;
  targetEquityPct: string;
  user1Deposit: string;
  user1Split: string;
  user1Cap: string;
  user2Deposit: string;
  user2Split: string;
  user2Cap: string;
}

interface MortgageSetupFormProps {
  users: UserOption[];
  initialValues?: MortgageInitialValues;
  submitLabel?: string;
}

export function MortgageSetupForm({ users, initialValues, submitLabel }: MortgageSetupFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [propertyValue, setPropertyValue] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [annualRate, setAnnualRate] = useState("");
  const [termYears, setTermYears] = useState("");
  const [startDate, setStartDate] = useState("");
  const [user1Deposit, setUser1Deposit] = useState("");
  const [user1Split, setUser1Split] = useState("70");
  const [user1Cap, setUser1Cap] = useState("");
  const [user2Deposit, setUser2Deposit] = useState("500000");
  const [user2Split, setUser2Split] = useState("30");
  const [user2Cap, setUser2Cap] = useState("");
  const [targetEquityPct, setTargetEquityPct] = useState("50");

  useEffect(() => {
    if (!initialValues) return;
    setPropertyValue(initialValues.propertyValue);
    setLoanAmount(initialValues.loanAmount);
    setAnnualRate(initialValues.annualRate);
    setTermYears(initialValues.termYears);
    setStartDate(initialValues.startDate);
    setTargetEquityPct(initialValues.targetEquityPct);
    setUser1Deposit(initialValues.user1Deposit);
    setUser1Split(initialValues.user1Split);
    setUser1Cap(initialValues.user1Cap);
    setUser2Deposit(initialValues.user2Deposit);
    setUser2Split(initialValues.user2Split);
    setUser2Cap(initialValues.user2Cap);
  }, [initialValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const pv = parseFloat(propertyValue.replace(/\s/g, "").replace(",", "."));
    const loan = parseFloat(loanAmount.replace(/\s/g, "").replace(",", "."));
    const rate = parseFloat(annualRate.replace(/,/g, "."));
    const years = parseInt(termYears, 10);
    const u1d = parseFloat(user1Deposit.replace(/\s/g, "").replace(",", ".")) || 0;
    const u2d = parseFloat(user2Deposit.replace(/\s/g, "").replace(",", ".")) || 0;
    const u1s = parseFloat(user1Split) / 100;
    const u2s = parseFloat(user2Split) / 100;
    const u1c = user1Cap ? parseFloat(user1Cap.replace(/\s/g, "").replace(",", ".")) : undefined;
    const u2c = user2Cap ? parseFloat(user2Cap.replace(/\s/g, "").replace(",", ".")) : undefined;
    const targetPct = parseFloat(targetEquityPct);
    const targetEquity = Number.isNaN(targetPct) ? 0.5 : Math.max(0, Math.min(100, targetPct)) / 100;

    if (Number.isNaN(pv) || Number.isNaN(loan) || Number.isNaN(rate) || Number.isNaN(years) || years < 1) {
      setError("Check property value, loan, rate and term.");
      return;
    }
    if (users.length < 2) {
      setError("Need two users.");
      return;
    }

    startTransition(async () => {
      const result = await saveMortgageConfig({
        propertyValue: toMinorUnits(pv),
        loanAmount: toMinorUnits(loan),
        annualInterestRate: rate,
        loanTermMonths: years * 12,
        startDate: startDate || new Date().toISOString().slice(0, 10),
        targetEquityUserAPct: targetEquity,
        users: [
          { userId: users[0].id, initialDeposit: toMinorUnits(u1d), baseSplitPct: u1s, monthlyCap: u1c ? toMinorUnits(u1c) : undefined },
          { userId: users[1].id, initialDeposit: toMinorUnits(u2d), baseSplitPct: u2s, monthlyCap: u2c ? toMinorUnits(u2c) : undefined },
        ],
      });
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4">
        <h3 className="font-medium">Loan details</h3>
        <div>
          <Label>Property value (R)</Label>
          <Input type="text" inputMode="decimal" value={propertyValue} onChange={(e) => setPropertyValue(e.target.value)} placeholder="0" required />
        </div>
        <div>
          <Label>Loan amount (R)</Label>
          <Input type="text" inputMode="decimal" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} placeholder="0" required />
        </div>
        <div>
          <Label>Annual interest rate (%) — e.g. 11.5 or 0.115</Label>
          <Input type="text" inputMode="decimal" value={annualRate} onChange={(e) => setAnnualRate(e.target.value)} placeholder="11.5" required />
        </div>
        <div>
          <Label>Term (years)</Label>
          <Input type="number" min={1} value={termYears} onChange={(e) => setTermYears(e.target.value)} required />
        </div>
        <div>
          <Label>Start date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </div>
        <div>
          <Label>Target share of the home – person who pays the extra (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={targetEquityPct}
            onChange={(e) => setTargetEquityPct(e.target.value)}
            placeholder="50 for 50/50"
          />
          <p className="text-xs text-muted-foreground mt-1">
            The share of the home you want that person to end up with (e.g. 50 for 50/50).
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        <h3 className="font-medium">{users[0]?.name ?? "User 1"}</h3>
        <div>
          <Label>Initial deposit (R)</Label>
          <Input type="text" inputMode="decimal" value={user1Deposit} onChange={(e) => setUser1Deposit(e.target.value)} placeholder="0" />
        </div>
        <div>
          <Label>Share of the minimum payment (%)</Label>
          <Input type="number" min={0} max={100} value={user1Split} onChange={(e) => setUser1Split(e.target.value)} />
          <p className="text-xs text-muted-foreground mt-1">This person pays this % of the minimum monthly amount.</p>
        </div>
        <div>
          <Label>Maximum this person pays per month (R, optional)</Label>
          <Input type="text" inputMode="decimal" value={user1Cap} onChange={(e) => setUser1Cap(e.target.value)} placeholder="Optional" />
        </div>
      </div>

      <div className="grid gap-4">
        <h3 className="font-medium">{users[1]?.name ?? "User 2"}</h3>
        <div>
          <Label>Initial deposit (R)</Label>
          <Input type="text" inputMode="decimal" value={user2Deposit} onChange={(e) => setUser2Deposit(e.target.value)} placeholder="500000" />
        </div>
        <div>
          <Label>Share of the minimum payment (%)</Label>
          <Input type="number" min={0} max={100} value={user2Split} onChange={(e) => setUser2Split(e.target.value)} />
          <p className="text-xs text-muted-foreground mt-1">This person pays this % of the minimum monthly amount.</p>
        </div>
        <div>
          <Label>Maximum this person pays per month (R, optional)</Label>
          <Input type="text" inputMode="decimal" value={user2Cap} onChange={(e) => setUser2Cap(e.target.value)} placeholder="Optional" />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : submitLabel ?? (initialValues ? "Update mortgage" : "Save mortgage")}
      </Button>
    </form>
  );
}
