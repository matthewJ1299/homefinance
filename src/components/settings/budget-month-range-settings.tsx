"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateBudgetMonthStartDayAction } from "@/lib/actions/user-preferences.actions";
import { toast } from "sonner";

interface BudgetMonthRangeSettingsProps {
  currentStartDay: number;
}

export function BudgetMonthRangeSettings({ currentStartDay }: BudgetMonthRangeSettingsProps) {
  const router = useRouter();
  const [value, setValue] = useState(String(currentStartDay));
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setValue(String(currentStartDay));
  }, [currentStartDay]);

  const handleSave = () => {
    setMessage(null);
    const day = Number(value);
    startTransition(async () => {
      const result = await updateBudgetMonthStartDayAction(day);
      if (!result.success) {
        setValue(String(currentStartDay));
        setMessage(result.error);
        toast.error(result.error);
        return;
      }
      setMessage("Saved.");
      toast.success("Settings saved.");
      void router.refresh();
    });
  };

  const dayOptions = Array.from({ length: 28 }, (_, i) => i + 1);

  return (
    <section className="rounded-lg border bg-card p-4 space-y-3">
      <div>
        <h2 className="text-sm font-medium">Budget month range</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Choose which day each budget month starts. The period runs from that day until the day before the
          same calendar day next month (e.g. 25th to 24th). Day 1 means a normal calendar month. Days are
          limited to 1-28 so every month has a valid start date.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
        <div className="space-y-1.5 flex-1 max-w-xs">
          <Label htmlFor="budget-month-start">Month starts on</Label>
          <select
            id="budget-month-start"
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          >
            {dayOptions.map((d) => (
              <option key={d} value={String(d)}>
                {d === 1 ? "1st (calendar month)" : `${d}${ordinalSuffix(d)} of the month`}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </section>
  );
}

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
