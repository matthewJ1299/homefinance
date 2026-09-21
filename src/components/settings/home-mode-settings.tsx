"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateHomeModeAction } from "@/lib/actions/user-preferences.actions";
import type { HomeMode } from "@/lib/features/home-mode";

/**
 * Per-user toggle between envelope budgeting and plain tracking. Optimistic per
 * docs/mutations-ux.md: flip immediately, refresh on success, roll back on
 * failure. The copy is honest -- nothing is deleted, and the partner is
 * unaffected -- because the budget is per-user in the data model.
 */
export function HomeModeSettings({ currentMode }: { currentMode: HomeMode }) {
  const router = useRouter();
  const [mode, setMode] = useState<HomeMode>(currentMode);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMode(currentMode);
  }, [currentMode]);

  const choose = (next: HomeMode) => {
    if (next === mode || isPending) return;
    setMode(next);
    startTransition(async () => {
      const result = await updateHomeModeAction(next);
      if (!result.success) {
        setMode(currentMode);
        toast.error(result.error);
        return;
      }
      toast.success(next === "tracker" ? "Budgeting turned off." : "Budgeting turned on.");
      void router.refresh();
    });
  };

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <div>
        <h2 className="text-sm font-medium">Budgeting</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          With budgeting on, Home shows your envelopes and what&apos;s left to spend. Turn it off
          to run as a simple tracker — Home shows your balances, what you&apos;re owed, and spending
          by category instead. Your budget is kept and comes back if you switch it on again. This
          only changes your own view; anyone else in your household is unaffected.
        </p>
      </div>
      <div
        role="group"
        aria-label="Budgeting mode"
        className="inline-flex gap-2"
      >
        <Button
          type="button"
          variant={mode === "budget" ? "default" : "outline"}
          size="sm"
          aria-pressed={mode === "budget"}
          disabled={isPending}
          onClick={() => choose("budget")}
        >
          Budgeting on
        </Button>
        <Button
          type="button"
          variant={mode === "tracker" ? "default" : "outline"}
          size="sm"
          aria-pressed={mode === "tracker"}
          disabled={isPending}
          onClick={() => choose("tracker")}
        >
          Just tracking
        </Button>
      </div>
    </section>
  );
}
