"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { repairBudgetMonths, resetBudget } from "@/lib/actions/budget.actions";

/**
 * Two budget-layer maintenance controls, scoped to the signed-in user:
 *  - Repair: re-opens skipped months (safe, nothing deleted).
 *  - Reset: clears all assignments, carry-over and transfers (destructive,
 *    behind a confirm). Neither touches expenses, income or balances.
 */
export function BudgetMaintenanceSettings() {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isRepairing, startRepair] = useTransition();
  const [isResetting, startReset] = useTransition();

  function onRepair() {
    startRepair(async () => {
      const result = await repairBudgetMonths();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.openedCount > 0
          ? `Re-opened ${result.openedCount} ${result.openedCount === 1 ? "month" : "months"} and rebuilt carry-over.`
          : "Nothing to repair — every month is already open."
      );
      router.refresh();
    });
  }

  function onReset() {
    startReset(async () => {
      const result = await resetBudget();
      setConfirmOpen(false);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Budget reset. Open the Budget page to assign your money afresh.");
      router.refresh();
    });
  }

  return (
    <section className="rounded-lg border bg-card p-4 space-y-4">
      <div>
        <h2 className="text-sm font-medium">Fix or reset your budget</h2>
        <p className="text-xs text-muted-foreground mt-1">
          These affect only your own envelope budget — your assignments and carry-over. Your
          expenses, income and account balances are never touched.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Repair months</p>
            <p className="text-xs text-muted-foreground">
              Re-opens any months you skipped and rebuilds carry-over. Safe — nothing is deleted.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={onRepair} disabled={isRepairing}>
            {isRepairing ? "Repairing…" : "Repair months"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Reset budget</p>
            <p className="text-xs text-muted-foreground">
              Clears all your assignments, carry-over and budget transfers so you can start fresh.
              Fixed-cost templates re-fill when a new month opens. Can&apos;t be undone.
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
            disabled={isResetting}
          >
            Reset budget
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Reset your budget?"
        description="This clears all your budget assignments, carry-over and transfers, across every month, so you can start assigning from scratch. Your expenses, income and account balances stay exactly as they are. This can't be undone."
        confirmLabel="Reset budget"
        destructive
        isPending={isResetting}
        onConfirm={onReset}
      />
    </section>
  );
}
