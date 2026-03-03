"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { MortgageInitialValues } from "./mortgage-setup-form";
import { MortgageSetupForm } from "./mortgage-setup-form";

interface UserOption {
  id: number;
  name: string;
}

interface MortgageUpdateSectionProps {
  users: UserOption[];
  initialValues: MortgageInitialValues;
}

export function MortgageUpdateSection({ users, initialValues }: MortgageUpdateSectionProps) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between p-4 text-left font-semibold hover:bg-muted/50 transition-colors rounded-lg"
        aria-expanded={open}
      >
        <span>Change loan or who pays what</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="border-t p-4">
          <p className="text-sm text-muted-foreground mb-4">
            Update interest rate, loan term, property or loan amount, or each person&apos;s share and maximum monthly payment.
          </p>
          <MortgageSetupForm users={users} initialValues={initialValues} />
        </div>
      )}
    </section>
  );
}
