"use client";

import { cn } from "@/lib/utils";
import { formatRand } from "@/lib/utils/currency";
import {
  flowFromStoredAmount,
  flowLabel,
  magnitudeFromStoredAmount,
} from "@/lib/services/recon/recon-flow";

/**
 * Bank-line amount with its direction as a word, not only a sign.
 *
 * Stored negative is money in; stored positive (including every historical
 * row) is money out. Colour is extra — In/Out is what a colour-blind read
 * still gets.
 */
export function ReconAmount({
  amountMinor,
  className,
}: {
  amountMinor: number;
  className?: string;
}) {
  const flow = flowFromStoredAmount(amountMinor);
  return (
    <span className={cn("shrink-0 text-right tabular-nums", className)}>
      <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {flowLabel(flow)}
      </span>
      <span
        className={cn(
          "text-base font-semibold",
          flow === "in" ? "text-success" : "text-foreground"
        )}
      >
        {formatRand(magnitudeFromStoredAmount(amountMinor))}
      </span>
    </span>
  );
}
