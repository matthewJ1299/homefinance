"use client";

import { createContext, useContext } from "react";

const BudgetMonthStartDayContext = createContext<number>(1);

export function BudgetMonthStartDayProvider({
  value,
  children,
}: {
  value: number;
  children: React.ReactNode;
}) {
  return (
    <BudgetMonthStartDayContext.Provider value={value}>{children}</BudgetMonthStartDayContext.Provider>
  );
}

export function useBudgetMonthStartDay(): number {
  return useContext(BudgetMonthStartDayContext);
}
