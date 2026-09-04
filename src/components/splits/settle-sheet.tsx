"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatRand, toMinorUnits } from "@/lib/utils/currency";
import { settleSplit } from "@/lib/actions/split.actions";

export interface SettleTargetCategory {
  categoryId: number;
  categoryName: string;
  available: number;
}

/**
 * Asks the one question it has to: where does the money land?
 *
 * Targets are ordered most-negative first, so the repayment defaults to
 * repairing the thing that was bothering you rather than arriving as
 * unassigned income you then have to place.
 */
export function SettleSheet({
  open,
  onOpenChange,
  recipient,
  groupId,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipient: { userId: number; userName: string; iOwe: number } | null;
  groupId: number | null;
  categories: SettleTargetCategory[];
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ordered = useMemo(
    () => [...categories].sort((a, b) => a.available - b.available),
    [categories]
  );

  useEffect(() => {
    if (!open || !recipient) return;
    setAmount((recipient.iOwe / 100).toFixed(2));
    setDate(new Date().toISOString().slice(0, 10));
    setCategoryId(ordered[0]?.categoryId ?? null);
    setError(null);
  }, [open, recipient, ordered]);

  if (!recipient) return null;

  const amountMinor = (() => {
    const n = Number(amount.replace(",", "."));
    return Number.isFinite(n) && n > 0 ? toMinorUnits(n) : 0;
  })();

  const target = ordered.find((c) => c.categoryId === categoryId) ?? null;
  const after = target ? target.available + amountMinor : 0;

  function submit() {
    if (groupId == null) {
      setError("No split group to settle in.");
      return;
    }
    if (amountMinor <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (amountMinor > recipient!.iOwe) {
      setError(`You owe ${formatRand(recipient!.iOwe)} at most.`);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await settleSplit({
        recipientUserId: recipient!.userId,
        amountCents: amountMinor,
        date,
        groupId: groupId!,
        targetCategoryId: categoryId ?? undefined,
      });
      if (!res.success) {
        setError(res.error);
        toast.error(res.error);
        return;
      }
      toast.success(`Settled ${formatRand(amountMinor)} with ${recipient!.userName}.`);
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} label={`Settle with ${recipient.userName}`}>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div>
          <h2 className="text-base font-semibold">Settle with {recipient.userName}</h2>
          <p className="text-sm text-muted-foreground">
            You owe {formatRand(recipient.iOwe)}.
          </p>
        </div>

        <div className="flex gap-2">
          <Input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label="Amount"
            className="tabular-nums"
          />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Date"
            className="w-40 shrink-0"
          />
        </div>

        {ordered.length > 0 ? (
          <div>
            <p className="pb-1.5 text-xs font-medium text-muted-foreground">
              Where should it land?
            </p>
            <div className="flex flex-wrap gap-2">
              {ordered.map((c) => (
                <button
                  key={c.categoryId}
                  type="button"
                  onClick={() => setCategoryId(c.categoryId)}
                  aria-pressed={c.categoryId === categoryId}
                  className={cn(
                    "flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium cursor-pointer",
                    c.categoryId === categoryId
                      ? "border-primary bg-primary text-primary-foreground"
                      : c.available < 0
                        ? "border-destructive/50 bg-destructive/[0.08] text-destructive"
                        : "border-border bg-muted text-foreground"
                  )}
                >
                  <span>{c.categoryName}</span>
                  <span className="text-[11px] tabular-nums opacity-75">
                    {c.available < 0
                      ? `${formatRand(Math.abs(c.available))} over`
                      : `${formatRand(c.available)} left`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {target && amountMinor > 0 ? (
          <div
            className={cn(
              "min-h-[50px] rounded-xl border px-3 py-2 text-sm",
              after >= 0
                ? "border-success/30 bg-success-surface text-success"
                : "border-destructive/40 bg-destructive/[0.08] text-destructive"
            )}
            aria-live="polite"
          >
            {target.available < 0 ? (
              <>
                {target.categoryName} is {formatRand(Math.abs(target.available))} over, so it&rsquo;s
                suggested first. Putting the {formatRand(amountMinor)} there{" "}
                {after >= 0
                  ? `clears the overspend and leaves ${formatRand(after)} in the category.`
                  : `brings it back to ${formatRand(Math.abs(after))} over.`}
              </>
            ) : (
              <>
                {target.categoryName} will have {formatRand(after)} left.
              </>
            )}
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          onClick={submit}
          disabled={pending || amountMinor <= 0}
          className="h-12 w-full rounded-xl text-base"
        >
          {target ? `Settle into ${target.categoryName}` : `Settle ${formatRand(amountMinor)}`}
        </Button>
      </div>
    </Sheet>
  );
}
