"use client";

import { useMemo, useState, useEffect } from "react";
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

/** Variable categories first, then fixed; within each by group and name. */
function sortVariableFirstThenGroupAndName(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => {
    const variableFirst =
      (a.costType === "variable" ? 0 : 1) - (b.costType === "variable" ? 0 : 1);
    if (variableFirst !== 0) return variableFirst;
    return a.groupName.localeCompare(b.groupName) || a.name.localeCompare(b.name);
  });
}

interface CategoryPickerProps {
  categories: Category[];
  value: number | null;
  onChange: (categoryId: number) => void;
  className?: string;
}

export function CategoryPicker({ categories, value, onChange, className }: CategoryPickerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const sorted = useMemo(() => {
    const variableFirst = sortVariableFirstThenGroupAndName(categories);
    if (!mounted) return variableFirst;
    const recent = getRecentCategoryIds();
    return [...variableFirst].sort((a, b) => {
      const ai = recent.indexOf(a.id);
      const bi = recent.indexOf(b.id);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return 0;
    });
  }, [categories, mounted]);

  const handleSelect = (id: number) => {
    pushRecentCategoryId(id);
    onChange(id);
  };

  return (
    <div className={cn("flex flex-wrap gap-2 pb-2", className)}>
      {sorted.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => handleSelect(c.id)}
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
  );
}
