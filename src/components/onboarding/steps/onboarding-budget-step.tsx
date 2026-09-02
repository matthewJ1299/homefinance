"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { autoAllocateBudget } from "@/lib/actions/budget.actions";
import { BudgetCategoryCard } from "@/components/budget/budget-category-card";
import { UnallocatedBanner } from "@/components/budget/unallocated-banner";
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

  const toBeAllocated = overview.toBeAllocated ?? overview.unallocated;

  return (
    <div className="space-y-4">
      {toBeAllocated !== 0 ? <UnallocatedBanner toBeAllocated={toBeAllocated} /> : null}
      <div className="space-y-3">
        {overview.categories.map((cat) => (
          <BudgetCategoryCard
            key={cat.categoryId}
            categoryId={cat.categoryId}
            categoryName={cat.categoryName}
            groupName={cat.groupName}
            costType={cat.costType}
            allocated={cat.allocated}
            spent={cat.spent}
            totalIncome={overview.totalIncome}
            month={month}
            onTransfer={() => {}}
          />
        ))}
      </div>
      {overview.categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add income and categories first, then return to this step.
        </p>
      ) : null}
      {isPending ? (
        <p className="text-xs text-muted-foreground">Allocating your budget…</p>
      ) : null}
    </div>
  );
}
