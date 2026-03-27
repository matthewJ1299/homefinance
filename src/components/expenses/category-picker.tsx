"use client";

import { useEffect, useMemo, useState } from "react";
import type { Category } from "@/lib/types";
import { formatRand } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const RECENT_KEY = "homefinance-recent-categories";
const TOP_USED_COUNT = 8;

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

function byUsageThenName(categories: Category[], usage?: Record<number, number> | null): Category[] {
  if (!usage) return byIncomingOrder(categories);
  return [...categories].sort((a, b) => {
    const ca = usage[a.id] ?? 0;
    const cb = usage[b.id] ?? 0;
    if (cb !== ca) return cb - ca;
    return a.name.localeCompare(b.name);
  });
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
  pillsClassName,
}: {
  label: string;
  categories: Category[];
  value: number | null;
  onSelect: (id: number) => void;
  budgetByCategory?: Map<number, CategoryBudgetHint>;
  className?: string;
  pillsClassName?: string;
}) {
  if (categories.length === 0) return null;
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground mb-1.5 font-medium">{label}</p>
      <div className={cn("flex flex-wrap gap-2", pillsClassName)}>
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
  const [usageCounts, setUsageCounts] = useState<Record<number, number> | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/expenses/category-usage")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: unknown) => {
        if (cancelled) return;
        if (!data || typeof data !== "object") return;
        const maybeCounts = (data as { counts?: unknown }).counts;
        if (maybeCounts && typeof maybeCounts === "object") {
          setUsageCounts(maybeCounts as Record<number, number>);
        }
      })
      .catch(() => {
        // ignore
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const mostUsed = useMemo(() => {
    return byUsageThenName(categories, usageCounts).slice(0, TOP_USED_COUNT);
  }, [categories, usageCounts]);

  const { variable, fixed } = useMemo(() => {
    const variableList = byUsageThenName(
      categories.filter((c) => c.costType === "variable"),
      usageCounts
    );
    const fixedList = byUsageThenName(
      categories.filter((c) => c.costType === "fixed"),
      usageCounts
    );
    return { variable: variableList, fixed: fixedList };
  }, [categories, usageCounts]);

  const handleSelect = (id: number) => {
    pushRecentCategoryId(id);
    onChange(id);
  };

  return (
    <div className={cn("space-y-4 pb-2", className)}>
      <PillSection
        label="Most used"
        categories={mostUsed}
        value={value}
        onSelect={handleSelect}
        budgetByCategory={budgetByCategory}
        pillsClassName="flex-nowrap overflow-x-auto no-scrollbar pb-1"
      />
      <div className="flex justify-start">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="px-2 h-7 text-xs"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : "Show more"}
        </Button>
      </div>
      {expanded ? (
        <>
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
        </>
      ) : null}
    </div>
  );
}
