"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { autoAllocateBudget } from "@/lib/actions/budget.actions";
import { BudgetCategoryRow } from "@/components/budget/budget-category-row";
import { BudgetCategorySheet } from "@/components/budget/budget-category-sheet";
import { Card } from "@/components/ui/card";
import { UnassignedHeadline } from "@/components/budget/unassigned-headline";
import type { BudgetOverviewResult } from "@/lib/services/budget.service";
import { toast } from "sonner";

export function OnboardingBudgetStep(props: {
  month: string;
  initialOverview: BudgetOverviewResult;
}) {
  const { month, initialOverview } = props;
  const router = useRouter();
  const [overview, setOverview] = useState(initialOverview);
  const [autoRan, setAutoRan] = useState(false);
  const [sheetCategoryId, setSheetCategoryId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (autoRan) return;
    if (initialOverview.totalIncome <= 0) return;
    setAutoRan(true);
    startTransition(async () => {
      const result = await autoAllocateBudget(month);
      if (result.success && result.updated > 0) {
        toast.success("Income spread across your categories.");
        router.refresh();
      }
    });
  }, [autoRan, initialOverview.totalIncome, month, router]);

  useEffect(() => {
    setOverview(initialOverview);
  }, [initialOverview]);

  const unassigned = overview.unassigned;
  const sheetCategory =
    overview.categories.find((c) => c.categoryId === sheetCategoryId) ?? null;

  return (
    <div className="space-y-4">
      {unassigned !== 0 ? (
        <UnassignedHeadline
          unassigned={unassigned}
          carriedOverspend={overview.carriedOverspend}
          overspentTotal={overview.overspentTotal}
          pending={isPending}
          onSpread={() =>
            startTransition(async () => {
              const result = await autoAllocateBudget(month);
              if (result.success) {
                toast.success("Spread across your categories.");
                router.refresh();
              } else {
                toast.error(result.error);
              }
            })
          }
          // Nothing has been spent during setup, so there is never an overspend
          // to cover here.
          onCover={() => {}}
        />
      ) : null}
      {/* The same row and keypad as the budget screen. The first budget
          anyone sets should not be the one interaction that exists nowhere
          else in the app. */}
      {overview.categories.length > 0 ? (
        <Card className="rounded-2xl px-3.5 py-0">
          {overview.categories.map((cat) => (
            <BudgetCategoryRow key={cat.categoryId} c={cat} onOpen={setSheetCategoryId} />
          ))}
        </Card>
      ) : null}
      {overview.categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add income and categories first, then return to this step.
        </p>
      ) : null}
      {isPending ? (
        <p className="text-xs text-muted-foreground">Allocating your budget…</p>
      ) : null}

      <BudgetCategorySheet
        open={sheetCategory != null}
        onOpenChange={(open) => !open && setSheetCategoryId(null)}
        category={sheetCategory}
        month={month}
        // No prior month during setup, and nothing has been spent yet, so
        // there is no "Match last month" figure and no transactions to list.
        lastMonthAssigned={0}
        transactions={[]}
        onMoveMoney={() => setSheetCategoryId(null)}
      />
    </div>
  );
}
