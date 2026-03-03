"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AmortisationTable } from "@/components/mortgage/amortisation-table";
import { MortgageUpdateSection } from "@/components/mortgage/mortgage-update-section";
import type { AmortisationRow } from "@/lib/types/mortgage.types";
import type { MortgageInitialValues } from "./mortgage-setup-form";

interface UserOption {
  id: number;
  name: string;
}

interface MortgageDetailsSectionProps {
  schedule: AmortisationRow[];
  userAName: string;
  userBName: string;
  users: UserOption[];
  initialValues: MortgageInitialValues | null;
}

export function MortgageDetailsSection({
  schedule,
  userAName,
  userBName,
  users,
  initialValues,
}: MortgageDetailsSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between p-4 text-left font-semibold hover:bg-muted/50 transition-colors rounded-lg"
        aria-expanded={open}
      >
        <span>More details</span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
      </button>
      {open && (
        <div className="border-t p-4 space-y-4">
          <AmortisationTable
            schedule={schedule}
            userAName={userAName}
            userBName={userBName}
          />
          {initialValues && (
            <MortgageUpdateSection users={users} initialValues={initialValues} />
          )}
        </div>
      )}
    </section>
  );
}
