"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { BudgetCategoryCard } from "./budget-category-card";
import type { BudgetCategoryRow } from "@/lib/services/budget.service";

interface SortableBudgetCategoryCardProps {
  cat: BudgetCategoryRow;
  totalIncome: number;
  month: string;
  onTransfer: () => void;
}

export function SortableBudgetCategoryCard({
  cat,
  totalIncome,
  month,
  onTransfer,
}: SortableBudgetCategoryCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cat.categoryId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-nowrap overflow-visible rounded-lg border border-border bg-card ${isDragging ? "opacity-50 z-10" : ""}`}
    >
      <div className="flex w-14 shrink-0 items-center justify-center border-r border-border bg-muted/50">
        <button
          type="button"
          className="flex touch-none cursor-grab active:cursor-grabbing items-center justify-center gap-1 rounded p-2 text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          aria-label={`Drag to reorder ${cat.categoryName}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5 shrink-0" aria-hidden />
          <span className="text-xs font-medium">Drag</span>
        </button>
      </div>
      <div className="min-w-0 flex-1">
        <BudgetCategoryCard
          categoryId={cat.categoryId}
          categoryName={cat.categoryName}
          groupName={cat.groupName}
          costType={cat.costType}
          allocated={cat.allocated}
          spent={cat.spent}
          totalIncome={totalIncome}
          month={month}
          onTransfer={onTransfer}
          embedded
        />
      </div>
    </div>
  );
}
