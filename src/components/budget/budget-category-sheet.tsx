"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatRand, toMinorUnits, fromMinorUnits } from "@/lib/utils/currency";
import { setBudgetAllocation } from "@/lib/actions/budget.actions";
import { updateCategory } from "@/lib/actions/category.actions";
import { formatDisplayDate, nextMonth } from "@/lib/utils/date";
import type { BudgetCategoryRow } from "@/lib/services/budget.service";
import type { ExpenseWithDetails } from "@/lib/types";

/** Month name six months out, for the sinking-fund projection. */
function monthNameAfter(month: string, steps: number): string {
  let m = month;
  for (let i = 0; i < steps; i++) m = nextMonth(m);
  const [y, mm] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mm - 1, 1)).toLocaleString("en-ZA", {
    month: "long",
    timeZone: "UTC",
  });
}

export function BudgetCategorySheet({
  open,
  onOpenChange,
  category,
  month,
  lastMonthAssigned,
  transactions,
  onMoveMoney,
  targetMinor,
  targetDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: BudgetCategoryRow | null;
  month: string;
  /** What this category was assigned last month, for the "Match" chip. */
  lastMonthAssigned: number;
  transactions: ExpenseWithDetails[];
  onMoveMoney: (categoryId: number) => void;
  /** Current target, when this category is a goal. */
  targetMinor?: number | null;
  targetDate?: string | null;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [targetDateInput, setTargetDateInput] = useState("");
  const [targetOpen, setTargetOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !category) return;
    setAmount(String(fromMinorUnits(category.assigned)));
    setTargetInput(targetMinor != null ? String(fromMinorUnits(targetMinor)) : "");
    setTargetDateInput(targetDate ?? "");
    setTargetOpen(targetMinor != null);
  }, [open, category, targetMinor, targetDate]);

  const parsed = useMemo(() => {
    const n = Number(amount.replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? toMinorUnits(n) : null;
  }, [amount]);

  // A sinking fund is where the rule needs explaining: money staying put is the
  // point, not an underspend you should feel bad about.
  const isSinkingFund =
    category != null &&
    category.rollover &&
    (category.groupName === "Saving up" || category.carriedIn > 0);

  if (!category) return null;

  const projectionMonths = 6;
  const projected = category.available + category.assigned * projectionMonths;

  function save(next: number) {
    startTransition(async () => {
      const res = await setBudgetAllocation(category!.categoryId, month, next);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(`${category!.categoryName} set to ${formatRand(next)}.`);
      router.refresh();
      onOpenChange(false);
    });
  }

  function saveTarget() {
    const n = Number(targetInput.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Enter a target amount.");
      return;
    }
    startTransition(async () => {
      const res = await updateCategory(category!.categoryId, {
        targetMinor: toMinorUnits(n),
        targetDate: targetDateInput || null,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(`${category!.categoryName} is saving towards ${formatRand(toMinorUnits(n))}.`);
      router.refresh();
    });
  }

  function clearTarget() {
    startTransition(async () => {
      const res = await updateCategory(category!.categoryId, {
        targetMinor: null,
        targetDate: null,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setTargetOpen(false);
      router.refresh();
    });
  }

  const chips: Array<{ label: string; value: number }> = [
    { label: "+R100", value: category.assigned + 10_000 },
    { label: "+R500", value: category.assigned + 50_000 },
    ...(lastMonthAssigned > 0
      ? [{ label: `Match last month (${formatRand(lastMonthAssigned)})`, value: lastMonthAssigned }]
      : []),
    { label: "Empty it out", value: 0 },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange} label={category.categoryName}>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <h2 className="text-base font-semibold">{category.categoryName}</h2>

        <p
          className={cn(
            "mt-2 text-4xl leading-none font-semibold tracking-tight tabular-nums",
            category.available < 0 ? "text-destructive" : "text-primary"
          )}
        >
          {formatRand(Math.abs(category.available))}
        </p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {category.available < 0 ? "over" : "left"}
          {category.carriedIn > 0
            ? ` · ${formatRand(category.carriedIn)} carried over from before, plus ${formatRand(category.assigned)} this month`
            : ` · ${formatRand(category.spent)} spent of ${formatRand(category.assigned)}`}
        </p>

        <div className="mt-4 flex gap-2">
          <Input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label={`Amount assigned to ${category.categoryName}`}
            className="tabular-nums"
          />
          <Button
            onClick={() => parsed != null && save(parsed)}
            disabled={pending || parsed == null}
            className="shrink-0"
          >
            Save
          </Button>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              disabled={pending}
              onClick={() => save(chip.value)}
              className="min-h-11 rounded-full border border-border bg-muted px-3.5 text-sm font-medium cursor-pointer disabled:opacity-50"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {isSinkingFund ? (
          <div className="mt-4 rounded-xl border border-success/30 bg-success-surface px-3 py-2.5 text-sm text-success">
            {/* The projection is what makes the rule click: the rule alone is
                abstract, the figure is the reason to keep going. */}
            Anything unspent stays here next month.
            {category.assigned > 0 ? (
              <>
                {" "}
                At {formatRand(category.assigned)} a month you&apos;ll have{" "}
                {formatRand(projected)} by {monthNameAfter(month, projectionMonths)}.
              </>
            ) : null}{" "}
            <Link href="/how-this-works/rollover" className="font-semibold underline">
              How this works
            </Link>
          </div>
        ) : null}

        {/* A goal is just a category with a target, so the target lives here
            rather than behind a separate Goals feature. */}
        <div className="mt-4">
          {targetOpen ? (
            <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
              <p className="text-xs font-medium text-muted-foreground">Saving towards</p>
              <div className="flex gap-2">
                <Input
                  inputMode="decimal"
                  placeholder="Target"
                  value={targetInput}
                  onChange={(ev) => setTargetInput(ev.target.value)}
                  aria-label="Target amount"
                  className="tabular-nums"
                />
                <Input
                  type="date"
                  value={targetDateInput}
                  onChange={(ev) => setTargetDateInput(ev.target.value)}
                  aria-label="Target date"
                  className="w-40 shrink-0"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveTarget} disabled={pending} className="h-10 flex-1">
                  Save target
                </Button>
                <Button
                  variant="outline"
                  onClick={clearTarget}
                  disabled={pending}
                  className="h-10"
                >
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setTargetOpen(true)}
              className="min-h-11 w-full rounded-xl border border-border bg-muted px-3.5 text-sm font-medium cursor-pointer"
            >
              Save towards something
            </button>
          )}
        </div>

        <div className="mt-2">
          <button
            type="button"
            onClick={() => onMoveMoney(category.categoryId)}
            className="min-h-11 w-full rounded-xl border border-border bg-muted px-3.5 text-sm font-medium cursor-pointer"
          >
            Move money in from another category
          </button>
        </div>

        <div className="mt-5">
          <p className="pb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            This month
          </p>
          {transactions.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">Nothing spent here yet.</p>
          ) : (
            <ul>
              {transactions.map((t) => (
                <li
                  key={t.id}
                  className="flex items-baseline justify-between gap-3 border-b border-border/50 py-2.5 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">{t.note || t.categoryName}</p>
                    <p className="text-xs text-muted-foreground">{formatDisplayDate(t.date)}</p>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums">
                    {formatRand(t.myShare ?? t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Sheet>
  );
}
