"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAddSheet } from "@/components/add/add-sheet-context";

const LONG_PRESS_MS = 450;

/**
 * The centre button.
 *
 * A tap opens the Add sheet in place rather than routing to /add: leaving the
 * screen to record a spend is what made the old two-step flow feel like work.
 * A long press still reaches the old hub, which is where tasks and events live.
 */
export function BottomNavAddButton({
  active,
  hasAddSheet,
}: {
  active: boolean;
  hasAddSheet: boolean;
}) {
  const router = useRouter();
  const addSheet = useAddSheet();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  const canOpenSheet = hasAddSheet && addSheet != null;

  function clear() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  function start() {
    if (!canOpenSheet) return;
    longPressed.current = false;
    clear();
    timer.current = setTimeout(() => {
      longPressed.current = true;
      router.push("/add");
    }, LONG_PRESS_MS);
  }

  function end() {
    clear();
  }

  function activate() {
    clear();
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    if (canOpenSheet) addSheet.open();
    else router.push("/add");
  }

  return (
    <button
      type="button"
      onPointerDown={start}
      onPointerUp={end}
      onPointerLeave={end}
      onPointerCancel={end}
      onContextMenu={(e) => e.preventDefault()}
      onClick={activate}
      className={cn(
        "flex flex-col items-center justify-center -mt-5 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl text-xl font-medium",
        "cursor-pointer transition-transform duration-200 hover:opacity-95 active:scale-95 touch-manipulation select-none",
        active && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
      )}
      aria-label={canOpenSheet ? "Add a spend" : "Create new"}
    >
      <span className="leading-none" aria-hidden>
        +
      </span>
      <span className="text-[10px] font-medium mt-0.5 leading-none">Add</span>
    </button>
  );
}
