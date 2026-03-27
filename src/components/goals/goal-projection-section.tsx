"use client";

import { useCallback, useEffect, useState } from "react";
import type { GoalDetailResponse } from "@/lib/services/goal-detail.service";
import type { CreditStrategyScenario, HorizonSliderScenario } from "@/lib/services/finance/credit";
import type { Goal } from "@/lib/types";
import { formatRand } from "@/lib/utils/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function parseRandToMinorUnits(value: string): number | null {
  const cleaned = value.replace(/\s/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100);
}

function formatScenarioMonths(m: number | null): string {
  if (m == null) return "Does not converge at this payment";
  if (m === 0) return "Paid off";
  return `${m} mo`;
}

export function GoalProjectionSection({
  goal,
  month,
  detail,
}: {
  goal: Goal;
  month: string;
  detail: GoalDetailResponse | null;
}) {
  const [savingsCustom, setSavingsCustom] = useState("");
  const [savingsScenario, setSavingsScenario] = useState<{
    ifContinueAtMonthlyActual: string | null;
    ifHitMonthlyTarget: string | null;
    ifCustomMonthly: string | null;
  } | null>(null);

  const [avPay, setAvPay] = useState("");
  const [sbPay, setSbPay] = useState("");
  const [targetMonth, setTargetMonth] = useState("");
  const [creditStrategies, setCreditStrategies] = useState<CreditStrategyScenario[] | null>(null);
  const [horizonMonths, setHorizonMonths] = useState(24);
  const [horizonScenario, setHorizonScenario] = useState<HorizonSliderScenario | null>(null);

  const refreshSavings = useCallback(async () => {
    if (goal.type !== "savings") return;
    const custom = parseRandToMinorUnits(savingsCustom);
    const res = await fetch(`/api/goals/${goal.id}/projection-scenario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month,
        savingsMonthlyContribution: custom && custom > 0 ? custom : undefined,
      }),
    });
    if (!res.ok) return;
    const data = await res.json();
    const p = data.projected as {
      ifContinueAtMonthlyActual?: string | null;
      ifHitMonthlyTarget?: string | null;
      ifCustomMonthly?: string | null;
    };
    setSavingsScenario({
      ifContinueAtMonthlyActual: p.ifContinueAtMonthlyActual ?? null,
      ifHitMonthlyTarget: p.ifHitMonthlyTarget ?? null,
      ifCustomMonthly: p.ifCustomMonthly ?? null,
    });
  }, [goal.id, goal.type, month, savingsCustom]);

  const refreshCredit = useCallback(async () => {
    if (goal.type !== "credit") return;
    const av = parseRandToMinorUnits(avPay);
    const sb = parseRandToMinorUnits(sbPay);
    const res = await fetch(`/api/goals/${goal.id}/projection-scenario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month,
        horizonMonths,
        avalancheMonthlyPayment: av && av > 0 ? av : undefined,
        snowballMonthlyPayment: sb && sb > 0 ? sb : undefined,
        targetPayoffMonth: targetMonth.trim() || undefined,
      }),
    });
    if (!res.ok) return;
    const data = await res.json();
    const list = data.projected?.strategies as CreditStrategyScenario[] | undefined;
    setCreditStrategies(list ?? null);
    const h = data.projected?.horizon as HorizonSliderScenario | null | undefined;
    setHorizonScenario(h ?? null);
  }, [goal.id, goal.type, month, horizonMonths, avPay, sbPay, targetMonth]);

  useEffect(() => {
    if (!detail) return;
    if (detail.goal.type === "savings" && detail.projected.type === "savings") {
      setSavingsScenario({
        ifContinueAtMonthlyActual: detail.projected.ifContinueAtMonthlyActual,
        ifHitMonthlyTarget: detail.projected.ifHitMonthlyTarget,
        ifCustomMonthly: null,
      });
    }
  }, [detail]);

  useEffect(() => {
    if (!detail || detail.goal.type !== "credit" || detail.projected.type !== "credit") return;
    setCreditStrategies(detail.projected.strategies);
  }, [detail]);

  useEffect(() => {
    if (!detail || detail.goal.type !== "credit" || detail.actual.type !== "credit") return;
    const pm = detail.actual.payoffMonths;
    setHorizonMonths(Math.min(120, Math.max(1, pm ?? 24)));
  }, [detail?.goal.id]);

  useEffect(() => {
    if (goal.type !== "credit") return;
    if (!detail || detail.goal.type !== "credit") return;
    void refreshCredit();
  }, [detail, goal.type, month, horizonMonths, avPay, sbPay, targetMonth, refreshCredit]);

  if (!detail) return null;

  if (goal.type === "savings" && detail.projected.type === "savings") {
    const p = detail.projected;
    const live = savingsScenario ?? {
      ifContinueAtMonthlyActual: p.ifContinueAtMonthlyActual,
      ifHitMonthlyTarget: p.ifHitMonthlyTarget,
      ifCustomMonthly: null as string | null,
    };

    return (
      <section
        className="rounded-xl border-2 border-dashed border-muted-foreground/50 bg-muted/10 p-4 opacity-95"
        aria-label="Projection"
      >
        <h2 className="text-sm font-medium text-muted-foreground">Projection</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Estimates only; computed live from your goal and activity. Not stored.
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <span className="text-muted-foreground">If you continue this month&apos;s net pace: </span>
            <span className="font-medium">{live.ifContinueAtMonthlyActual ?? "—"}</span>
          </li>
          <li>
            <span className="text-muted-foreground">If you hit your monthly target: </span>
            <span className="font-medium">{live.ifHitMonthlyTarget ?? "—"}</span>
          </li>
        </ul>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label className="text-xs">Custom monthly (R)</Label>
            <Input
              className="mt-1"
              inputMode="decimal"
              placeholder="e.g. 5000"
              value={savingsCustom}
              onChange={(e) => setSavingsCustom(e.target.value)}
            />
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => void refreshSavings()}>
            Update
          </Button>
        </div>
        {live.ifCustomMonthly && (
          <p className="mt-2 text-sm">
            At custom pace: <span className="font-medium">{live.ifCustomMonthly}</span>
          </p>
        )}
      </section>
    );
  }

  if (detail.projected.type !== "credit") return null;

  const strategies = creditStrategies ?? detail.projected.strategies;
  const creditActual = detail.actual.type === "credit" ? detail.actual : null;
  const hasDebt = creditActual != null && creditActual.debt > 0;

  return (
    <section
      className="rounded-xl border-2 border-dashed border-muted-foreground/50 bg-muted/10 p-4 opacity-95"
      aria-label="Projection"
    >
      <h2 className="text-sm font-medium text-muted-foreground">Projection</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Compare three strategies for this card. Avalanche and Snowball use the payments you enter (defaults: your plan).
        Target date finds the minimum payment to finish by the month you choose. Live calculation only.
      </p>

      {hasDebt && creditActual && (
        <div className="mt-4 rounded-lg border border-dashed border-muted-foreground/35 bg-background/30 p-4">
          <Label className="text-sm" htmlFor="goal-payoff-horizon-months">
            Max payoff time (months)
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Slide right to allow more months: the minimum monthly payment goes down, but total interest usually goes up.
            Compare to your plan and to tightening by one month.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <input
              id="goal-payoff-horizon-months"
              type="range"
              min={1}
              max={120}
              value={horizonMonths}
              onChange={(e) => setHorizonMonths(Number(e.target.value))}
              className="min-w-[12rem] flex-1 accent-primary"
            />
            <span className="tabular-nums text-sm font-medium">{horizonMonths} months</span>
          </div>
          {horizonScenario && (
            <div className="mt-4 space-y-2 text-sm">
              {horizonScenario.minimumMonthlyPayment != null ? (
                <>
                  <p>
                    <span className="text-muted-foreground">
                      Minimum payment to finish within {horizonScenario.horizonMonths} months:{" "}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatRand(horizonScenario.minimumMonthlyPayment)}
                    </span>
                    <span className="text-muted-foreground"> / mo</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Total interest at that payment (est.): </span>
                    <span className="font-semibold tabular-nums">
                      {formatRand(horizonScenario.payoffAtMinimum.totalInterest)}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    vs your plan ({formatRand(creditActual.monthlyTarget)}/mo): payment{" "}
                    {horizonScenario.paymentVersusPlanMinor != null && horizonScenario.paymentVersusPlanMinor !== 0 ? (
                      <span className="font-medium text-foreground">
                        {horizonScenario.paymentVersusPlanMinor < 0 ? "down " : "up "}
                        {formatRand(Math.abs(horizonScenario.paymentVersusPlanMinor))}/mo
                      </span>
                    ) : (
                      <span className="font-medium text-foreground">same</span>
                    )}
                    {", "}
                    interest{" "}
                    {horizonScenario.interestVersusPlanMinor !== 0 ? (
                      <span className="font-medium text-foreground">
                        {horizonScenario.interestVersusPlanMinor > 0 ? "up " : "down "}
                        {formatRand(Math.abs(horizonScenario.interestVersusPlanMinor))}
                      </span>
                    ) : (
                      <span className="font-medium text-foreground">same</span>
                    )}{" "}
                    (estimate)
                  </p>
                  {horizonScenario.shorterHorizon &&
                    horizonScenario.shorterHorizon.minimumMonthlyPayment != null &&
                    horizonScenario.minimumMonthlyPayment != null && (
                      <p className="border-l-2 border-primary/40 pl-3 text-xs leading-relaxed">
                        One month faster ({horizonScenario.shorterHorizon.horizonMonths} mo cap): pay about{" "}
                        <span className="font-medium tabular-nums">
                          {formatRand(
                            Math.abs(horizonScenario.shorterHorizon.extraMonthlyVersusSelectedMinor ?? 0)
                          )}
                        </span>
                        /mo more; roughly{" "}
                        <span className="font-medium tabular-nums">
                          {formatRand(Math.abs(horizonScenario.shorterHorizon.interestSavedVersusSelectedMinor))}
                        </span>{" "}
                        {horizonScenario.shorterHorizon.interestSavedVersusSelectedMinor >= 0
                          ? "less interest total"
                          : "more interest total"}
                      </p>
                    )}
                </>
              ) : (
                <p className="text-amber-800 dark:text-amber-200">
                  At this APR, this balance cannot be cleared in {horizonScenario.horizonMonths} months (payments would
                  not cover interest). Increase months on the slider or use a higher payment in the strategy fields
                  above.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <Label className="text-xs">Avalanche payment (R/mo)</Label>
          <Input
            className="mt-1"
            inputMode="decimal"
            placeholder="Plan default if empty"
            value={avPay}
            onChange={(e) => setAvPay(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Snowball payment (R/mo)</Label>
          <Input
            className="mt-1"
            inputMode="decimal"
            placeholder="Plan default if empty"
            value={sbPay}
            onChange={(e) => setSbPay(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Target payoff month</Label>
          <Input
            className="mt-1"
            placeholder="yyyy-MM"
            value={targetMonth}
            onChange={(e) => setTargetMonth(e.target.value)}
          />
        </div>
      </div>
      <Button type="button" className="mt-3" size="sm" variant="secondary" onClick={() => void refreshCredit()}>
        Recalculate
      </Button>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {strategies.map((s) => (
          <div
            key={s.strategy}
            className="rounded-lg border border-dashed border-muted-foreground/40 bg-background/40 p-3 text-sm"
          >
            <p className="font-medium capitalize">{s.strategy.replace("_", " ")}</p>
            <p className="mt-2 text-muted-foreground">
              Payment:{" "}
              <span className="font-medium text-foreground tabular-nums">{formatRand(s.monthlyPayment)}</span>
              {s.strategy === "target_date" && s.impliedMonthlyPayment != null && (
                <span className="block text-xs">(minimum for target month)</span>
              )}
            </p>
            <p className="mt-2">
              Payoff: <span className="font-medium">{formatScenarioMonths(s.payoff.months)}</span>
            </p>
            <p className="mt-1 text-muted-foreground">
              Total interest (est.):{" "}
              <span className="font-medium text-foreground tabular-nums">{formatRand(s.payoff.totalInterest)}</span>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
