"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { setBudgetAllocation } from "@/lib/actions/budget.actions";
import { formatRand } from "@/lib/utils/currency";
import { AllocationBar } from "./allocation-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface BudgetCategoryCardProps {
  categoryId: number;
  categoryName: string;
  groupName: string;
  costType?: "fixed" | "variable";
  allocated: number;
  spent: number;
  totalIncome: number;
  month: string;
  onTransfer: () => void;
  /** When true, omit outer border (used when card is inside a sortable wrapper that has the border). */
  embedded?: boolean;
}

export function BudgetCategoryCard({
  categoryId,
  categoryName,
  groupName,
  costType,
  allocated,
  spent,
  totalIncome,
  month,
  onTransfer,
  embedded = false,
}: BudgetCategoryCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amountInput, setAmountInput] = useState<string>(() =>
    allocated > 0 ? (allocated / 100).toFixed(2) : ""
  );

  useEffect(() => {
    setAmountInput(allocated > 0 ? (allocated / 100).toFixed(2) : "");
  }, [allocated]);

  const remaining = allocated - spent;
  const isOverspent = remaining < 0;

  const handleSaveAllocation = () => {
    const value = amountInput.trim().replace(/\s/g, "").replace(",", ".");
    const parsed = value === "" ? 0 : Math.round(parseFloat(value) * 100);
    if (value !== "" && (Number.isNaN(parsed) || parsed < 0)) return;
    startTransition(async () => {
      await setBudgetAllocation(categoryId, month, parsed);
      router.refresh();
    });
  };

  return (
    <div
      className={cn(
        "p-4 space-y-2",
        embedded && isOverspent && "bg-destructive/5",
        !embedded && "rounded-lg border",
        !embedded && (isOverspent ? "border-destructive/50 bg-destructive/5" : "border")
      )}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h3 className="font-medium">{categoryName}</h3>
          {costType === "fixed" && (
            <span className="text-xs rounded bg-primary/10 text-primary px-2 py-0.5">
              Fixed
            </span>
          )}
          <p className="text-xs text-muted-foreground">{groupName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <label htmlFor={`budget-${categoryId}`} className="sr-only">
            Budget amount (R) for {categoryName}
          </label>
          <Input
            id={`budget-${categoryId}`}
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            onBlur={handleSaveAllocation}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSaveAllocation();
              }
            }}
            className="w-28 h-9 text-right font-medium tabular-nums"
            aria-label={`Budget for ${categoryName}, in rand`}
          />
          <span className="text-sm text-muted-foreground">R</span>
          <Button
            type="button"
            size="sm"
            onClick={handleSaveAllocation}
            disabled={isPending}
          >
            {isPending ? "..." : "Save"}
          </Button>
        </div>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Spent {formatRand(spent)}</span>
        <span className={cn(isOverspent && "text-destructive font-medium")}>
          {isOverspent ? `Over by ${formatRand(-remaining)}` : `Left ${formatRand(remaining)}`}
        </span>
      </div>
      <AllocationBar
        allocated={allocated}
        spent={spent}
        totalIncome={totalIncome}
      />
      {isOverspent && (
        <Button variant="outline" size="sm" onClick={onTransfer} className="w-full">
          Move money to cover
        </Button>
      )}
    </div>
  );
}
