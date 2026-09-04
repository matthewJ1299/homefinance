"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { HouseholdMember } from "@/lib/types/household-member";
import { AddSheet, type AddSheetCategory, type AddSheetPrefill } from "./add-sheet";

interface AddSheetData {
  me: HouseholdMember;
  members: HouseholdMember[];
  categories: AddSheetCategory[];
  accounts: { id: number; name: string }[];
  defaultAccountId?: number;
  /** The date the sheet opens on, inside the current budget period. */
  defaultDate: string;
}

interface AddSheetContextValue {
  /** Opens the sheet, optionally prefilled -- a list's shop, a calendar event. */
  open: (prefill?: AddSheetPrefill) => void;
}

const AddSheetContext = createContext<AddSheetContextValue | null>(null);

/**
 * Holds the Add sheet for the whole shell, so the bottom bar's centre button
 * opens it in place instead of routing away and losing what you were looking at.
 */
export function AddSheetProvider({
  data,
  children,
}: {
  data: AddSheetData | null;
  children: React.ReactNode;
}) {
  const [prefill, setPrefill] = useState<AddSheetPrefill | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback((next?: AddSheetPrefill) => {
    setPrefill(next ?? {});
    setIsOpen(true);
  }, []);

  const value = useMemo(() => ({ open }), [open]);

  return (
    <AddSheetContext.Provider value={value}>
      {children}
      {data ? (
        <AddSheet
          open={isOpen}
          onOpenChange={setIsOpen}
          me={data.me}
          members={data.members}
          categories={data.categories}
          accounts={data.accounts}
          defaultAccountId={data.defaultAccountId}
          defaultDate={data.defaultDate}
          prefill={prefill ?? {}}
        />
      ) : null}
    </AddSheetContext.Provider>
  );
}

/**
 * Returns null when no provider is above -- the sheet needs household data the
 * shell loads, so surfaces outside it fall back to routing to /add.
 */
export function useAddSheet(): AddSheetContextValue | null {
  return useContext(AddSheetContext);
}
