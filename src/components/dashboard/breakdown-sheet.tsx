"use client";

import { cn } from "@/lib/utils";
import { Sheet } from "@/components/ui/sheet";
import { formatRand } from "@/lib/utils/currency";

export interface BreakdownFigures {
  totalAssigned: number;
  totalCarriedIn: number;
  envelopeTotal: number;
  spent: number;
  envelopeLeft: number;
  owedToYou: number;
  unassigned: number;
  /** Who owes you, for the closing sentence. */
  owedByNames: string[];
}

/**
 * The full derivation behind the hero figure.
 *
 * Five rows: the third emphasised because it is the hero figure, the last two
 * below a rule because they are not spendable yet.
 */
export function BreakdownSheet({
  open,
  onOpenChange,
  figures,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  figures: BreakdownFigures;
}) {
  const owedDetail =
    figures.owedByNames.length > 0
      ? `${figures.owedByNames.join(" and ")} still to settle`
      : "Nothing outstanding";

  const rows = [
    {
      label: "Set aside this month",
      note: `${formatRand(figures.totalAssigned)} assigned, plus ${formatRand(figures.totalCarriedIn)} carried over`,
      value: figures.envelopeTotal,
      emphasis: false,
      dim: false,
    },
    {
      label: "Spent so far",
      note: "Your share only, on shared spends",
      value: -figures.spent,
      emphasis: false,
      dim: false,
    },
    {
      label: "Left in your categories",
      note: "The figure on Home",
      value: figures.envelopeLeft,
      emphasis: true,
      dim: false,
    },
    {
      label: "Owed to you",
      note: owedDetail,
      value: figures.owedToYou,
      emphasis: false,
      dim: true,
    },
    {
      label: "Not assigned yet",
      note: "Money with no job",
      value: figures.unassigned,
      emphasis: false,
      dim: true,
    },
  ];

  const settler = figures.owedByNames[0] ?? "they";

  return (
    <Sheet open={open} onOpenChange={onOpenChange} label="Breakdown">
      <div className="overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <h2 className="pb-1 text-base font-semibold">Where it comes from</h2>
        <div>
          {rows.map((r, i) => (
            <div
              key={r.label}
              className={cn(
                "flex items-baseline justify-between gap-3 py-3",
                i > 0 && "border-t border-border/50",
                // Below the line: real money, but not in an envelope yet.
                r.dim && "opacity-70",
                i === 3 && "border-t-2 border-border"
              )}
            >
              <div className="min-w-0">
                <p className={cn("text-sm", r.emphasis ? "font-semibold" : "font-medium")}>
                  {r.label}
                </p>
                <p className="text-xs text-muted-foreground">{r.note}</p>
              </div>
              <span
                className={cn(
                  "shrink-0 tabular-nums",
                  r.emphasis ? "text-lg font-semibold" : "text-sm font-medium",
                  r.value < 0 && r.emphasis && "text-destructive"
                )}
              >
                {formatRand(r.value)}
              </span>
            </div>
          ))}
        </div>
        <p className="pt-3 text-xs leading-relaxed text-muted-foreground">
          Money owed to you sits below the line on purpose. It&rsquo;s yours, but it isn&rsquo;t in
          an envelope yet — when {settler} settles, you choose which category it lands in.
        </p>
      </div>
    </Sheet>
  );
}
