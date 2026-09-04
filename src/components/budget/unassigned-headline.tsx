"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatRand } from "@/lib/utils/currency";

/**
 * The Budget page's one headline. Replaces the donut, the four-stat grid and
 * the unallocated banner, which between them stated the same figures four
 * times.
 */
export function UnassignedHeadline({
  unassigned,
  carriedOverspend,
  overspentTotal,
  onSpread,
  onCover,
  pending = false,
}: {
  unassigned: number;
  carriedOverspend: number;
  overspentTotal: number;
  onSpread: () => void;
  onCover: () => void;
  pending?: boolean;
}) {
  const isOver = unassigned < 0;
  const isDone = unassigned === 0;

  if (isDone) {
    return (
      <Card className="rounded-2xl border-success/35 bg-success-surface p-4">
        <p className="text-sm font-semibold text-success">Every rand has a job</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Nothing left to assign this month.{" "}
          {overspentTotal > 0
            ? `${formatRand(overspentTotal)} is over in a category or two — worth a look below.`
            : "Nothing over, either."}
        </p>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "rounded-2xl p-[18px]",
        isOver
          ? "border-destructive/40 bg-destructive/[0.06]"
          : "border-warning/40 bg-warning-surface"
      )}
    >
      <p
        className={cn(
          "text-[13px] font-semibold",
          isOver ? "text-destructive" : "text-warning"
        )}
      >
        {isOver ? "You've promised more than you have" : "Not given a job yet"}
      </p>
      <p className="mt-3 text-4xl leading-none font-semibold tracking-tight tabular-nums">
        {formatRand(Math.abs(unassigned))}
      </p>
      <p className="mt-3 text-sm leading-snug">
        {isOver
          ? "Take it back off a category, or the month starts behind."
          : "Money with nothing to do. Put it somewhere, or it just drifts."}
      </p>
      {carriedOverspend > 0 ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Includes {formatRand(carriedOverspend)} that came off last month&apos;s overspend.
        </p>
      ) : null}
      <div className="mt-3.5 flex flex-wrap gap-2">
        <Button
          onClick={onSpread}
          disabled={pending || isOver}
          className="h-10 rounded-full bg-emphasis px-4 text-emphasis-foreground"
        >
          Spread it for me
        </Button>
        {overspentTotal > 0 ? (
          <Button
            variant="outline"
            onClick={onCover}
            disabled={pending}
            className="h-10 rounded-full px-4"
          >
            Cover the {formatRand(overspentTotal)} over
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
