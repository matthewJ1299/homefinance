import Link from "next/link";
import { formatRand } from "@/lib/utils/currency";
import { Card } from "@/components/ui/card";

/**
 * The Home hero for tracker mode (budgeting switched off). Where the budget hero
 * leads with "left to spend" -- meaningless without envelope assignment -- this
 * leads with two facts that need no budget: cash across accounts and where you
 * stand on shared spends. Both are already computed on the dashboard.
 *
 * The second tile is signed: `owedNet` is positive when others owe you on net
 * and negative when you owe on net. A tile that only ever counted what others
 * owe read "All settled up" while you were in the red, so a net debt flips the
 * label to "You owe" and shows what you owe rather than nothing.
 */
export function TrackerHero({
  cashOnHand,
  accountsCount,
  owedNet,
  owedByNames,
  owedToNames,
}: {
  cashOnHand: number;
  accountsCount: number;
  /** Signed: > 0 they owe you, < 0 you owe, 0 settled. */
  owedNet: number;
  /** People who owe you (for the owed-to-you detail line). */
  owedByNames: string[];
  /** People you owe (for the you-owe detail line). */
  owedToNames: string[];
}) {
  const youOwe = owedNet < 0;
  const amount = Math.abs(owedNet);
  const label = youOwe ? "You owe" : "Owed to you";
  const detail = youOwe
    ? owedToNames.length > 0
      ? owedToNames.join(", ")
      : "From shared spends"
    : owedNet > 0
      ? owedByNames.length > 0
        ? owedByNames.join(", ")
        : "From shared spends"
      : "All settled up";

  const amountClass = youOwe
    ? "mt-0.5 text-2xl font-semibold tabular-nums text-destructive"
    : owedNet > 0
      ? "mt-0.5 text-2xl font-semibold tabular-nums text-primary"
      : "mt-0.5 text-2xl font-semibold tabular-nums";

  return (
    <section className="grid grid-cols-2 gap-3">
      <Link href="/accounts" className="block">
        <Card className="h-full rounded-2xl px-4 py-3.5">
          <p className="text-xs text-muted-foreground">In accounts</p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums">{formatRand(cashOnHand)}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {accountsCount === 1 ? "1 account" : `${accountsCount} accounts`}
          </p>
        </Card>
      </Link>
      <Link href="/splits" className="block">
        <Card className="h-full rounded-2xl px-4 py-3.5">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={amountClass}>{formatRand(amount)}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{detail}</p>
        </Card>
      </Link>
    </section>
  );
}
