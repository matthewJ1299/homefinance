"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROW_TONE, type RowTone } from "./needs-you-row";

interface NeedsYouGroupRowProps {
  icon: LucideIcon;
  label: string;
  count: number;
  /** The most urgent member's title, so the summary still names one real thing. */
  topTitle: string;
  rowTone?: RowTone;
  expanded: boolean;
  onToggle: () => void;
}

/**
 * The collapsed stand-in for a source that has flooded the stream: one row that
 * says how many of a kind need you and names the most urgent, expanding in place
 * to the individual rows. Keeps a mis-configured budget from burying an event.
 */
export function NeedsYouGroupRow({
  icon: Icon,
  label,
  count,
  topTitle,
  rowTone = "neutral",
  expanded,
  onToggle,
}: NeedsYouGroupRowProps) {
  const t = ROW_TONE[rowTone];
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border p-3 text-left",
        "transition-opacity hover:opacity-90 active:scale-[0.99] touch-manipulation",
        t.card
      )}
    >
      <span
        className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", t.icon)}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {label} · {count} need you
        </p>
        <p className="truncate text-xs text-muted-foreground">{topTitle}</p>
      </div>
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
          expanded && "rotate-180"
        )}
        aria-hidden
      />
    </button>
  );
}
