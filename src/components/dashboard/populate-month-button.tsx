"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { populateMonth } from "@/lib/actions/population.actions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PopulateMonthButtonProps {
  month: string;
}

export function PopulateMonthButton({ month }: PopulateMonthButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const handleClick = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await populateMonth(month);
      if (result.success) {
        const parts = [];
        if (result.incomeCreated > 0) parts.push(`${result.incomeCreated} income`);
        if (result.expensesCreated > 0) parts.push(`${result.expensesCreated} expenses`);
        setMessage(
          parts.length > 0
            ? `Created ${parts.join(", ")}.`
            : result.errors.length > 0
              ? result.errors.join(" ")
              : "Nothing to add (all recurring items already exist for this month)."
        );
        if (result.incomeCreated > 0 || result.expensesCreated > 0) {
          toast.success("Month populated.");
          void router.refresh();
        } else if (result.errors.length > 0) {
          toast.error(result.errors.join(" "));
        } else {
          toast.success("Nothing to add.");
        }
        setTimeout(() => setMessage(null), 5000);
      } else {
        setMessage(result.error);
        setTimeout(() => setMessage(null), 5000);
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? "Populating..." : "Populate this month"}
      </Button>
      {message && (
        <p className="text-xs text-muted-foreground">{message}</p>
      )}
    </div>
  );
}
