import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type RowTone = "bad" | "warn" | "good" | "neutral";

export const ROW_TONE: Record<RowTone, { card: string; icon: string; action: string }> = {
  bad: {
    card: "border-destructive/35 bg-destructive/[0.06]",
    icon: "bg-destructive/15 text-destructive",
    action: "bg-emphasis text-emphasis-foreground",
  },
  warn: {
    card: "border-warning/40 bg-warning-surface",
    icon: "bg-warning/20 text-warning",
    action: "bg-card text-warning border border-warning/40",
  },
  good: {
    card: "border-success/35 bg-success-surface",
    icon: "bg-success/15 text-success",
    action: "bg-card text-foreground border",
  },
  neutral: {
    card: "border-border bg-card",
    icon: "bg-primary/12 text-primary",
    action: "bg-muted text-foreground border",
  },
};

interface NeedsYouRowProps {
  icon: LucideIcon;
  title: string;
  /** Passed to the top-priority row only; the rest are a title and a verb. */
  detail?: string;
  actionLabel: string;
  href: string;
  rowTone?: RowTone;
}

/**
 * One row shape for everything actionable in the app: icon, title, sub-line,
 * one action. Adding a feature adds a row kind, not a card design.
 */
export function NeedsYouRow({
  icon: Icon,
  title,
  detail,
  actionLabel,
  href,
  rowTone = "neutral",
}: NeedsYouRowProps) {
  const t = ROW_TONE[rowTone];
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border p-3", t.card)}>
      <span
        className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", t.icon)}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        {detail ? <p className="truncate text-xs text-muted-foreground">{detail}</p> : null}
      </div>
      <Link
        href={href}
        className={cn(
          "flex h-11 shrink-0 items-center rounded-full px-3.5 text-xs font-semibold",
          "cursor-pointer transition-opacity hover:opacity-90 active:scale-[0.98] touch-manipulation",
          t.action
        )}
      >
        {actionLabel}
      </Link>
    </div>
  );
}
