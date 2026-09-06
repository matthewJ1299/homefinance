"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { updateCategory } from "@/lib/actions/category.actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toMinorUnits } from "@/lib/utils/currency";
import type { CategoryWithActive } from "@/lib/types";
import {
  ONBOARDING_DEFAULT_ACTIVE_NAMES,
  ONBOARDING_HIDDEN_CATEGORY_NAMES,
} from "@/lib/onboarding/steps";
import { toast } from "sonner";

interface CategoryDraft {
  active: boolean;
  sameEveryMonth: boolean;
  amountInput: string;
}

function isFreshCategorySelection(categories: CategoryWithActive[]): boolean {
  return categories.every((c) => c.isActive);
}

function initialDraft(category: CategoryWithActive, categories: CategoryWithActive[]): CategoryDraft {
  const fresh = isFreshCategorySelection(categories);
  const active = fresh
    ? ONBOARDING_DEFAULT_ACTIVE_NAMES.has(category.name)
    : category.isActive;
  const sameEveryMonth = category.costType === "fixed";
  const amountInput =
    category.defaultAmount != null && category.defaultAmount > 0
      ? (category.defaultAmount / 100).toFixed(2)
      : "";
  return { active, sameEveryMonth, amountInput };
}

export function OnboardingCategoriesStep(props: {
  categories: CategoryWithActive[];
  onReadyChange: (ready: boolean) => void;
  onPersistRef: React.MutableRefObject<(() => Promise<boolean>) | null>;
}) {
  const { categories: allCategories, onReadyChange, onPersistRef } = props;
  // Splits and Mortgage are plumbing: one is where settlements land, the other
  // is driven by the mortgage itself. Asking someone to tick them as spending
  // areas invites them to turn off a category the app needs.
  const categories = useMemo(
    () => allCategories.filter((c) => !ONBOARDING_HIDDEN_CATEGORY_NAMES.has(c.name)),
    [allCategories]
  );
  const [drafts, setDrafts] = useState<Record<number, CategoryDraft>>(() => {
    const map: Record<number, CategoryDraft> = {};
    for (const c of categories) {
      map[c.id] = initialDraft(c, categories);
    }
    return map;
  });
  const [isPending, startTransition] = useTransition();

  const activeCount = useMemo(
    () => categories.filter((c) => drafts[c.id]?.active).length,
    [categories, drafts]
  );

  useEffect(() => {
    onReadyChange(activeCount > 0);
  }, [activeCount, onReadyChange]);

  const updateDraft = (id: number, patch: Partial<CategoryDraft>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id]!, ...patch } }));
  };

  const persist = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      startTransition(async () => {
        for (const category of categories) {
          const draft = drafts[category.id];
          if (!draft) continue;

          let defaultAmount: number | null = null;
          if (draft.sameEveryMonth && draft.amountInput.trim()) {
            const parsed = parseFloat(draft.amountInput.replace(/\s/g, "").replace(",", "."));
            if (!Number.isNaN(parsed) && parsed > 0) {
              defaultAmount = toMinorUnits(parsed);
            }
          }

          const result = await updateCategory(category.id, {
            isActive: draft.active,
            costType: draft.sameEveryMonth ? "fixed" : "variable",
            defaultAmount,
          });
          if (!result.success) {
            toast.error(result.error);
            resolve(false);
            return;
          }
        }
        toast.success("Categories saved.");
        resolve(true);
      });
    });
  }, [categories, drafts]);

  useEffect(() => {
    onPersistRef.current = persist;
  }, [persist, onPersistRef]);

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {categories.map((category) => {
          const draft = drafts[category.id]!;
          return (
            <li
              key={category.id}
              className="rounded-lg border bg-card p-3 space-y-3"
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={draft.active}
                  onChange={(e) =>
                    updateDraft(category.id, { active: e.target.checked })
                  }
                />
                <span className="text-sm font-medium pt-0.5">{category.name}</span>
              </label>
              {draft.active ? (
                <div className="pl-7 space-y-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.sameEveryMonth}
                      onChange={(e) =>
                        updateDraft(category.id, { sameEveryMonth: e.target.checked })
                      }
                      className="rounded border-input"
                    />
                    <span>Same amount every month?</span>
                  </label>
                  {draft.sameEveryMonth ? (
                    <div className="space-y-1 max-w-xs">
                      <Label htmlFor={`cat-amt-${category.id}`} className="text-xs">
                        Typical monthly amount (R)
                      </Label>
                      <Input
                        id={`cat-amt-${category.id}`}
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={draft.amountInput}
                        onChange={(e) =>
                          updateDraft(category.id, { amountInput: e.target.value })
                        }
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">
        {activeCount === 0
          ? "Select at least one category to continue."
          : `${activeCount} categories selected. Changes save when you continue.`}
      </p>
      {isPending ? <p className="text-xs text-muted-foreground">Saving…</p> : null}
    </div>
  );
}
