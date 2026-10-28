"use client";

import { useState } from "react";
import { EnvelopeHero } from "./envelope-hero";
import { BreakdownSheet, type BreakdownFigures } from "./breakdown-sheet";

/**
 * Pairs the hero with its breakdown sheet, so the page stays a server component
 * and only the open/closed state lives on the client.
 */
export function EnvelopeHeroSection({
  envelopeLeft,
  envelopeTotal,
  spent,
  daysLeft,
  periodLabel,
  elapsedPct,
  figures,
}: {
  envelopeLeft: number;
  envelopeTotal: number;
  spent: number;
  daysLeft: number;
  periodLabel: string;
  elapsedPct: number;
  figures: BreakdownFigures;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <EnvelopeHero
        envelopeLeft={envelopeLeft}
        envelopeTotal={envelopeTotal}
        spent={spent}
        daysLeft={daysLeft}
        periodLabel={periodLabel}
        elapsedPct={elapsedPct}
        owedToYou={figures.owedToYou}
        onBreakdown={() => setOpen(true)}
      />
      <BreakdownSheet open={open} onOpenChange={setOpen} figures={figures} />
    </>
  );
}
