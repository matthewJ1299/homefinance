"use client";

import { useMemo } from "react";
import type { Category } from "@/lib/types";
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

function sortByGroupAndName(categories: Category[]): Category[] {
  return [...categories].sort(
    (a, b) => a.groupName.localeCompare(b.groupName) || a.name.localeCompare(b.name)
  );
}

interface CategoryPickerProps {
  categories: Category[];
  value: number | null;
  onChange: (categoryId: number) => void;
  className?: string;
}

function PillSection({
  label,
  categories,
  value,
  onSelect,
  className,
}: {
  label: string;
  categories: Category[];
  value: number | null;
  onSelect: (id: number) => void;
  className?: string;
}) {
  if (categories.length === 0) return null;
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground mb-1.5 font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors border",
              value === c.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-input hover:bg-accent"
            )}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CategoryPicker({ categories, value, onChange, className }: CategoryPickerProps) {
  const { variable, fixed } = useMemo(() => {
    const variableList = sortByGroupAndName(
      categories.filter((c) => c.costType === "variable")
    );
    const fixedList = sortByGroupAndName(
      categories.filter((c) => c.costType === "fixed")
    );
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
      />
      <PillSection
        label="Fixed costs"
        categories={fixed}
        value={value}
        onSelect={handleSelect}
      />
    </div>
  );
}
