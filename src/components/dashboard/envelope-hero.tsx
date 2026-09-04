"use client";

import { cn } from "@/lib/utils";
import { formatRand } from "@/lib/utils/currency";
import { Card } from "@/components/ui/card";

interface EnvelopeHeroProps {
  envelopeLeft: number;
  envelopeTotal: number;
  spent: number;
  daysLeft: number;
  /** "25 Aug – 24 Sep". */
  periodLabel: string;
  /** How far through the budget period today is, 0-100. */
  elapsedPct: number;
  owedToYou: number;
  onBreakdown: () => void;
}

export function EnvelopeHero({
  envelopeLeft,
  envelopeTotal,
  spent,
  daysLeft,
  periodLabel,
  elapsedPct,
  owedToYou,
  onBreakdown,
}: EnvelopeHeroProps) {
  const perDay = daysLeft > 0 ? Math.round(envelopeLeft / daysLeft) : envelopeLeft;
  const usedPct = envelopeTotal > 0 ? Math.min(100, (spent / envelopeTotal) * 100) : 0;
  const isNegative = envelopeLeft < 0;

  return (
    <Card className="rounded-2xl border-primary/25 bg-gradient-to-b from-background to-primary/[0.04] p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">Left in your categories</span>
        <button
          type="button"
          onClick={onBreakdown}
          className="-my-2 min-h-11 cursor-pointer px-1 text-xs font-semibold text-primary"
        >
          Breakdown
        </button>
      </div>

      <p
        className={cn(
          "mt-3 text-[2.75rem] leading-none font-semibold tracking-tight tabular-nums",
          isNegative && "text-destructive"
        )}
      >
        {formatRand(envelopeLeft)}
      </p>

      {/* A negative hero changes the sentence, not just the colour: "R -1 200 a
          day" is nonsense. */}
      <p className="mt-3 text-[15px] leading-snug">
        {isNegative ? (
          <>
            You&apos;ve assigned more than you have. <strong>Fix it below.</strong>
          </>
        ) : (
          <>
            About <strong>{formatRand(perDay)} a day</strong> for the {daysLeft} days left.
          </>
        )}
      </p>

      <div className="mt-3 space-y-1.5">
        <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-all",
              // Amber only when spending is 10+ points ahead of the month.
              // Any tighter and it cries wolf on the day after payday.
              usedPct > elapsedPct + 10 ? "bg-warning" : "bg-primary"
            )}
            style={{ width: `${usedPct}%` }}
          />
          {/* Today marker. --emphasis so it survives dark mode. */}
          <div
            className="absolute -top-0.5 -bottom-0.5 w-0.5 rounded bg-emphasis"
            style={{ left: `${elapsedPct}%` }}
            aria-hidden
          />
        </div>
        <div className="flex justify-between gap-2 text-xs text-muted-foreground tabular-nums">
          <span>
            {formatRand(spent)} spent of {formatRand(envelopeTotal)} set aside
          </span>
          <span className="shrink-0">{periodLabel}</span>
        </div>
      </div>

      {/* Owed money is a footnote, never in the hero figure: your share of a
          shared shop already left your envelope, so adding the debt back would
          count the same rand twice. */}
      {owedToYou > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Plus {formatRand(owedToYou)} owed to you — not in an envelope yet.
        </p>
      ) : null}
    </Card>
  );
}
