"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatRand } from "@/lib/utils/currency";
import { BudgetCategoryCard } from "./budget-category-card";
import { UnallocatedBanner } from "./unallocated-banner";
import { TransferDialog } from "./transfer-dialog";
import { autoAllocateBudget } from "@/lib/actions/budget.actions";
import { Button } from "@/components/ui/button";
import type { BudgetOverviewResult } from "@/lib/services/budget.service";
import type { Category, ExpenseWithDetails } from "@/lib/types";
import { BudgetDonutChart } from "./budget-donut-chart";
import { BudgetCategorySummaryTile } from "./budget-category-summary-tile";
import { RecentExpensesCard } from "@/components/dashboard/recent-expenses-card";
import { toast } from "sonner";

interface BudgetOverviewProps {
  data: BudgetOverviewResult;
  recentExpenses?: ExpenseWithDetails[];
  expenseCategories?: Category[];
  otherUserName?: string;
}

export function BudgetOverview({
  data,
  recentExpenses = [],
  expenseCategories = [],
  otherUserName,
}: BudgetOverviewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [autoAllocateError, setAutoAllocateError] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState<{
    categoryId: number;
    categoryName: string;
    overspentAmount: number;
  } | null>(null);

  const categoriesWithRemaining = data.categories.map((c) => ({
    categoryId: c.categoryId,
    categoryName: c.categoryName,
    remaining: c.remaining,
  }));

  return (
    <div className="space-y-6 pb-8">
      <div className="rounded-2xl border border-border/60 bg-card/90 p-4 sm:p-5 shadow-sm space-y-5">
        <BudgetDonutChart allocated={data.totalAllocated} spent={data.totalExpenses} />
        <div className="grid gap-3 sm:grid-cols-2 border-t border-border/50 pt-4">
          <div className="flex justify-between text-sm gap-2">
            <span className="text-muted-foreground">Total income</span>
            <span className="font-medium tabular-nums">{formatRand(data.totalIncome)}</span>
          </div>
          <div className="flex justify-between text-sm gap-2">
            <span className="text-muted-foreground">Total expenses</span>
            <span className="font-medium tabular-nums">{formatRand(data.totalExpenses)}</span>
          </div>
          <div className="flex justify-between text-sm gap-2">
            <span className="text-muted-foreground">Balance</span>
            <span className="font-medium tabular-nums">{formatRand(data.balance)}</span>
          </div>
          <div className="flex justify-between text-sm gap-2">
            <span className="text-muted-foreground">Allocated</span>
            <span className="font-medium tabular-nums">{formatRand(data.totalAllocated)}</span>
          </div>
        </div>
        {!data.isBalanced && <UnallocatedBanner unallocated={data.unallocated} />}
      </div>

      <BudgetCategorySummaryTile categories={data.categories} />

      {recentExpenses.length > 0 && expenseCategories.length > 0 && (
        <RecentExpensesCard
          expenses={recentExpenses}
          categories={expenseCategories}
          otherUserName={otherUserName}
          title="Recent transactions"
          seeAllHref={`/expenses?month=${encodeURIComponent(data.month)}`}
        />
      )}

      <div
        className="sticky top-14 z-10 -mx-4 px-4 py-3 sm:-mx-6 sm:px-6 bg-background/95 backdrop-blur-sm border-b border-border/60 shadow-sm rounded-t-xl"
        aria-live="polite"
      >
        {autoAllocateError && (
          <p className="text-sm text-destructive mb-2" role="alert">
            {autoAllocateError}
          </p>
        )}
        <div className="flex justify-between items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Yet to allocate</span>
          <div className="flex items-center gap-2">
            <span className="font-semibold tabular-nums">
              {data.unallocated > 0 ? formatRand(data.unallocated) : "Fully allocated"}
            </span>
            {data.unallocated > 0 && (
              <Button
                variant="secondary"
                size="sm"
                disabled={isPending}
                className="cursor-pointer"
                onClick={() => {
                  setAutoAllocateError(null);
                  startTransition(async () => {
                    const result = await autoAllocateBudget(data.month);
                    if (result.success) {
                      toast.success("Budget auto-allocated.");
                      void router.refresh();
                    } else {
                      setAutoAllocateError(result.error);
                      toast.error(result.error);
                    }
                  });
                }}
              >
                {isPending ? "Allocating…" : "Auto-allocate"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-semibold text-base tracking-tight">Categories and allocations</h2>
        <div className="space-y-4">
          {data.categories.map((cat) => (
            <div
              key={cat.categoryId}
              className="rounded-2xl border border-border/60 bg-card/80 overflow-hidden shadow-sm"
            >
              <BudgetCategoryCard
                categoryId={cat.categoryId}
                categoryName={cat.categoryName}
                groupName={cat.groupName}
                costType={cat.costType}
                allocated={cat.allocated}
                spent={cat.spent}
                totalIncome={data.totalIncome}
                month={data.month}
                onTransfer={() =>
                  setTransferTarget({
                    categoryId: cat.categoryId,
                    categoryName: cat.categoryName,
                    overspentAmount: -cat.remaining,
                  })
                }
              />
            </div>
          ))}
        </div>
      </div>

      {data.transfers.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold">Transfers</h2>
          <ul className="text-sm space-y-1">
            {data.transfers.map((t) => (
              <li key={t.id} className="text-muted-foreground">
                {formatRand(t.amount)} from {t.fromCategoryName} to {t.toCategoryName}
                {t.reason && ` (${t.reason})`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {transferTarget && (
        <TransferDialog
          open={!!transferTarget}
          onOpenChange={(open) => !open && setTransferTarget(null)}
          fromCategoryId={transferTarget.categoryId}
          fromCategoryName={transferTarget.categoryName}
          overspentAmount={transferTarget.overspentAmount}
          categories={categoriesWithRemaining.filter((c) => c.remaining > 0)}
          month={data.month}
        />
      )}
    </div>
  );
}
