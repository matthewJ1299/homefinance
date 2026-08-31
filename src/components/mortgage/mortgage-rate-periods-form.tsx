"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMortgageRatePeriods } from "@/lib/actions/mortgage.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export interface MortgageRatePeriodFormRow {
  effectiveFromMonth: string;
  annualRate: string;
}

interface MortgageRatePeriodsFormProps {
  defaultAnnualRatePct: string;
  initialPeriods: MortgageRatePeriodFormRow[];
}

function emptyRow(): MortgageRatePeriodFormRow {
  return { effectiveFromMonth: "", annualRate: "" };
}

export function MortgageRatePeriodsForm({
  defaultAnnualRatePct,
  initialPeriods,
}: MortgageRatePeriodsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [rows, setRows] = useState<MortgageRatePeriodFormRow[]>(
    initialPeriods.length > 0 ? initialPeriods : [emptyRow()]
  );

  const updateRow = (index: number, patch: Partial<MortgageRatePeriodFormRow>) => {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const periods = rows
      .map((row) => ({
        effectiveFromMonth: parseInt(row.effectiveFromMonth, 10),
        annualInterestRate: parseFloat(row.annualRate.replace(/,/g, ".")),
      }))
      .filter(
        (row) =>
          Number.isFinite(row.effectiveFromMonth) &&
          row.effectiveFromMonth >= 1 &&
          Number.isFinite(row.annualInterestRate) &&
          row.annualInterestRate > 0
      );

    startTransition(async () => {
      const result = await saveMortgageRatePeriods({ periods });
      if (result.success) {
        toast.success("Interest rate schedule saved. Upcoming payments were recalculated.");
        void router.refresh();
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Starting rate from loan setup: {defaultAnnualRatePct}% (applies from month 1 unless
        overridden below). Add a row when the bank changes your rate — from that loan month
        onward, the minimum payment is recalculated on what you still owe.
      </p>

      {rows.map((row, index) => (
        <div key={index} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end">
          <div>
            <Label htmlFor={`rate-month-${index}`}>From loan month</Label>
            <Input
              id={`rate-month-${index}`}
              type="number"
              min={1}
              value={row.effectiveFromMonth}
              onChange={(event) =>
                updateRow(index, { effectiveFromMonth: event.target.value })
              }
              placeholder="e.g. 6"
            />
          </div>
          <div>
            <Label htmlFor={`rate-value-${index}`}>Annual rate (%)</Label>
            <Input
              id={`rate-value-${index}`}
              type="text"
              inputMode="decimal"
              value={row.annualRate}
              onChange={(event) => updateRow(index, { annualRate: event.target.value })}
              placeholder="11"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
            disabled={rows.length === 1}
          >
            Remove
          </Button>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => setRows((current) => [...current, emptyRow()])}>
          Add rate change
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save rate schedule"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
