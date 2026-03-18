"use client";

import { useMemo } from "react";
import type { Category } from "@/lib/types";
import { formatRand } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

const RECENT_KEY = "homefinance-recent-categories";

function getRecentCategoryIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as number[];
  } catch {
    return [];
  }
}

function pushRecentCategoryId(id: number) {
  if (typeof window === "undefined") return;
  try {
    const recent = getRecentCategoryIds().filter((x) => x !== id);
    recent.unshift(id);
    const trimmed = recent.slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore
  }
}

function byIncomingOrder(categories: Category[]): Category[] {
  return [...categories];
}

export interface CategoryBudgetHint {
  remaining: number;
  isOverspent: boolean;
}

interface CategoryPickerProps {
  categories: Category[];
  value: number | null;
  onChange: (categoryId: number) => void;
  /** Optional per-category budget remaining (cents) for the current month. When set, shows e.g. "Groceries (R450 left)" or overspent in red. */
  budgetByCategory?: Map<number, CategoryBudgetHint>;
  className?: string;
}

function PillSection({
  label,
  categories,
  value,
  onSelect,
  budgetByCategory,
  className,
}: {
  label: string;
  categories: Category[];
  value: number | null;
  onSelect: (id: number) => void;
  budgetByCategory?: Map<number, CategoryBudgetHint>;
  className?: string;
}) {
  if (categories.length === 0) return null;
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground mb-1.5 font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => {
          const hint = budgetByCategory?.get(c.id);
          const labelText = hint
            ? hint.isOverspent
              ? `${c.name} (${formatRand(-hint.remaining)} over)`
              : `${c.name} (${formatRand(hint.remaining)} left)`
            : c.name;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors border",
                value === c.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-input hover:bg-accent",
                hint?.isOverspent && value !== c.id && "text-destructive border-destructive/50"
              )}
            >
              {labelText}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CategoryPicker({ categories, value, onChange, budgetByCategory, className }: CategoryPickerProps) {
  const { variable, fixed } = useMemo(() => {
    const variableList = byIncomingOrder(categories.filter((c) => c.costType === "variable"));
    const fixedList = byIncomingOrder(categories.filter((c) => c.costType === "fixed"));
    return { variable: variableList, fixed: fixedList };
  }, [categories]);

  const handleSelect = (id: number) => {
    pushRecentCategoryId(id);
    onChange(id);
  };

  return (
    <div className={cn("space-y-4 pb-2", className)}>
      <PillSection
        label="Variable costs"
        categories={variable}
        value={value}
        onSelect={handleSelect}
        budgetByCategory={budgetByCategory}
      />
      <PillSection
        label="Fixed costs"
        categories={fixed}
        value={value}
        onSelect={handleSelect}
        budgetByCategory={budgetByCategory}
      />
    </div>
  );
}
