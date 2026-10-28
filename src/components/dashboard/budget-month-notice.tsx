"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ordinalDay } from "@/lib/utils/date";
import { dismissBudgetMonthNotice } from "@/lib/actions/household.actions";

/**
 * Shown once, where members previously kept different budget month start days.
 *
 * The migration had to pick one, and quietly changing the window someone's
 * whole budget is framed by is exactly the kind of thing that should be said
 * out loud rather than discovered.
 */
export function BudgetMonthNotice({ startDay }: { startDay: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Card className="rounded-2xl border-warning/40 bg-warning-surface p-4">
      <p className="text-[13px] font-semibold text-warning">Your budget month changed</p>
      <p className="mt-1.5 text-sm leading-relaxed">
        The budget month is now a house setting, so you&rsquo;re both always looking at the same
        one. It runs from the <strong>{ordinalDay(startDay)}</strong>, which is the day the house
        was set up with.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          onClick={() =>
            startTransition(async () => {
              await dismissBudgetMonthNotice();
              router.refresh();
            })
          }
          disabled={pending}
          className="h-10 rounded-full px-4"
        >
          Got it
        </Button>
        <Link
          href="/settings"
          className="flex h-10 items-center rounded-full border border-border px-4 text-sm font-medium"
        >
          Change it
        </Link>
      </div>
    </Card>
  );
}
