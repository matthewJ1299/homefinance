"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  MortgageRatePeriodsForm,
  type MortgageRatePeriodFormRow,
} from "./mortgage-rate-periods-form";

interface MortgageRatePeriodsSectionProps {
  defaultAnnualRatePct: string;
  initialPeriods: MortgageRatePeriodFormRow[];
}

export function MortgageRatePeriodsSection({
  defaultAnnualRatePct,
  initialPeriods,
}: MortgageRatePeriodsSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between p-4 text-left font-semibold hover:bg-muted/50 transition-colors rounded-lg"
        aria-expanded={open}
      >
        <span>Interest rate changes</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="border-t p-4">
          <MortgageRatePeriodsForm
            defaultAnnualRatePct={defaultAnnualRatePct}
            initialPeriods={initialPeriods}
          />
        </div>
      )}
    </section>
  );
}
