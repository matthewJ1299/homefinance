"use client";

import { Button } from "@/components/ui/button";
import { useAddSheet } from "@/components/add/add-sheet-context";

/**
 * The home tile is a door to the Add sheet now, not a second form. What the
 * inline form could not do -- participants, live consequence, an uneven split --
 * is the reason the sheet exists.
 */
export function HomeQuickAddLauncher() {
  const addSheet = useAddSheet();
  if (!addSheet) return null;
  return (
    <Button
      type="button"
      onClick={() => addSheet.open()}
      className="h-12 w-full rounded-xl text-base"
    >
      Add a spend
    </Button>
  );
}
