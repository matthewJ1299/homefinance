"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { useBudgetMonthStartDay } from "@/components/settings/budget-month-start-context";
import {
  getCurrentBudgetMonth,
  prevMonth,
  nextMonth,
  formatBudgetMonthLabel,
} from "@/lib/utils/date";

export function useMonthNavigation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const budgetMonthStartDay = useBudgetMonthStartDay();
  const month = searchParams.get("month") ?? getCurrentBudgetMonth(budgetMonthStartDay);

  const setMonth = useCallback(
    (newMonth: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("month", newMonth);
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const goPrev = useCallback(() => {
    setMonth(prevMonth(month));
  }, [month, setMonth]);

  const goNext = useCallback(() => {
    setMonth(nextMonth(month));
  }, [month, setMonth]);

  const label = formatBudgetMonthLabel(month, budgetMonthStartDay);
  const canGoNext = month < getCurrentBudgetMonth(budgetMonthStartDay);

  return { month, setMonth, goPrev, goNext, label, canGoNext };
}
