"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { formatRand } from "@/lib/utils/currency";
import { SortableBudgetCategoryCard } from "./sortable-budget-category-card";
import { UnallocatedBanner } from "./unallocated-banner";
import { TransferDialog } from "./transfer-dialog";
import { autoAllocateBudget } from "@/lib/actions/budget.actions";
import { reorderCategories } from "@/lib/actions/category.actions";
import { Button } from "@/components/ui/button";
import type { BudgetOverviewResult } from "@/lib/services/budget.service";

interface BudgetOverviewProps {
  data: BudgetOverviewResult;
}

export function BudgetOverview({ data }: BudgetOverviewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [autoAllocateError, setAutoAllocateError] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
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

  const categoryIds = data.categories.map((c) => c.categoryId);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over == null || active.id === over.id) return;
    const oldIndex = categoryIds.indexOf(active.id as number);
    const newIndex = categoryIds.indexOf(over.id as number);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(categoryIds, oldIndex, newIndex);
    setReorderError(null);
    startTransition(async () => {
      const result = await reorderCategories(newOrder);
      if (result.success) {
        router.refresh();
      } else {
        setReorderError(result.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total income</span>
          <span className="font-medium">{formatRand(data.totalIncome)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total expenses</span>
          <span className="font-medium">{formatRand(data.totalExpenses)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Balance</span>
          <span className="font-medium">{formatRand(data.balance)}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Allocated</span>
          <span className="font-medium">{formatRand(data.totalAllocated)}</span>
        </div>
        {!data.isBalanced && (
          <UnallocatedBanner unallocated={data.unallocated} />
        )}
      </div>

      <div
        className="sticky top-14 z-10 -mx-4 px-4 py-3 sm:-mx-6 sm:px-6 bg-background border-b shadow-sm"
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
                onClick={() => {
                  setAutoAllocateError(null);
                  startTransition(async () => {
                    const result = await autoAllocateBudget(data.month);
                    if (result.success) {
                      router.refresh();
                    } else {
                      setAutoAllocateError(result.error);
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
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="font-semibold">Categories</h2>
          {reorderError && (
            <p className="text-sm text-destructive" role="alert">
              {reorderError}
            </p>
          )}
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={categoryIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {data.categories.map((cat) => (
                <SortableBudgetCategoryCard
                  key={cat.categoryId}
                  cat={cat}
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
              ))}
            </div>
          </SortableContext>
        </DndContext>
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
