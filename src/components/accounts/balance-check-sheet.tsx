"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRand, toMinorUnits } from "@/lib/utils/currency";
import { reconcileAccount } from "@/lib/actions/account-reconcile.actions";
import type { AccountWithBalance } from "@/lib/types";

/**
 * Three figures and two explicit buttons.
 *
 * Forgiving by default, exact if you want it, and never a silent correction:
 * accepting the gap writes one visible line rather than quietly moving the
 * number to match.
 */
export function BalanceCheckSheet({
  account,
  onOpenChange,
}: {
  account: AccountWithBalance | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [stated, setStated] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (account) setStated("");
  }, [account]);

  if (!account) return null;

  const statedMinor = (() => {
    const n = Number(stated.replace(",", "."));
    return Number.isFinite(n) && stated.trim() !== "" ? toMinorUnits(n) : null;
  })();
  const diff = statedMinor == null ? null : statedMinor - account.balance;

  function accept() {
    if (statedMinor == null) return;
    startTransition(async () => {
      const res = await reconcileAccount(account!.id, statedMinor!);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(
        res.adjusted === 0
          ? "Already matches your bank."
          : `Recorded ${formatRand(Math.abs(res.adjusted))} as Unaccounted.`
      );
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Sheet open={account != null} onOpenChange={onOpenChange} label={`Check ${account.name}`}>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <h2 className="text-base font-semibold">Check {account.name}</h2>

        <div className="space-y-0.5">
          <div className="flex justify-between border-b border-border/50 py-2.5 text-sm">
            <span className="text-muted-foreground">HomeFinance thinks</span>
            <span className="tabular-nums">{formatRand(account.balance)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-border/50 py-2.5 text-sm">
            <label htmlFor="stated-balance" className="text-muted-foreground">
              Your bank says
            </label>
            <Input
              id="stated-balance"
              inputMode="decimal"
              placeholder="0.00"
              value={stated}
              onChange={(e) => setStated(e.target.value)}
              className="w-36 text-right tabular-nums"
            />
          </div>
          <div className="flex justify-between py-2.5 text-sm font-semibold">
            <span>Difference</span>
            <span className={diff && diff !== 0 ? "text-destructive tabular-nums" : "tabular-nums"}>
              {diff == null ? "—" : formatRand(Math.abs(diff))}
            </span>
          </div>
        </div>

        {diff != null && diff !== 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {diff < 0
              ? "Probably a spend you haven't logged."
              : "Probably money in that hasn't been logged."}{" "}
            You can go and find it, or accept the difference — we&rsquo;ll record it as one{" "}
            {formatRand(Math.abs(diff))} line called Unaccounted so the number stays honest.
          </p>
        ) : null}

        <div className="space-y-2">
          <Button
            onClick={accept}
            disabled={pending || statedMinor == null}
            className="h-12 w-full rounded-xl text-base"
          >
            {diff != null && diff !== 0
              ? `Accept the ${formatRand(Math.abs(diff))} difference`
              : "Accept"}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="h-12 w-full rounded-xl text-base"
          >
            Let me look for it first
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
