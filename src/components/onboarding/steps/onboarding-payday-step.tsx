"use client";

import { useEffect, useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateBudgetMonthStartDayAction } from "@/lib/actions/user-preferences.actions";
import { toast } from "sonner";

function ordinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export function OnboardingPaydayStep(props: {
  budgetMonthStartDay: number;
  onSaved: (day: number) => void;
}) {
  const { budgetMonthStartDay, onSaved } = props;
  const [value, setValue] = useState(String(budgetMonthStartDay));
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setValue(String(budgetMonthStartDay));
  }, [budgetMonthStartDay]);

  const dayOptions = Array.from({ length: 28 }, (_, i) => i + 1);

  const handleSave = () => {
    const day = Number(value);
    startTransition(async () => {
      const result = await updateBudgetMonthStartDayAction(day);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Payday saved.");
      onSaved(day);
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5 max-w-sm">
        <Label htmlFor="onboarding-payday">Payday (day of the month)</Label>
        <select
          id="onboarding-payday"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        >
          {dayOptions.map((d) => (
            <option key={d} value={String(d)}>
              {d === 1 ? "1st of the month" : `${d}${ordinalSuffix(d)} of the month`}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          This sets the budget month for the whole house, so you&apos;re both always looking at
          the same one.
        </p>
      </div>
      <Button type="button" onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving…" : "Save payday"}
      </Button>
    </div>
  );
}
