"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { getCurrentMonth, prevMonth, nextMonth, formatMonth } from "@/lib/utils/date";

export function useMonthNavigation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const month = searchParams.get("month") ?? getCurrentMonth();

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

  const label = formatMonth(month);
  const canGoNext = month < getCurrentMonth(); // allow future? plan says month-by-month navigation

  return { month, setMonth, goPrev, goNext, label, canGoNext };
}
