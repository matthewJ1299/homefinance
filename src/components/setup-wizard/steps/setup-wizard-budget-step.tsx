"use client";

import { BudgetMonthRangeSettings } from "@/components/settings/budget-month-range-settings";

export function SetupWizardBudgetStep(props: { budgetMonthStartDay: number }) {
  const { budgetMonthStartDay } = props;
  return (
    <div className="space-y-3 text-sm">
      <div className="space-y-1">
        <p className="font-medium">Budget basics</p>
        <p className="text-muted-foreground">
          Set the start day for your budget month. This affects budgeting, summaries, and month-based grouping.
        </p>
      </div>
      <BudgetMonthRangeSettings currentStartDay={budgetMonthStartDay} />
    </div>
  );
}

