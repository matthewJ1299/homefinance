import Link from "next/link";
import { formatRand } from "@/lib/utils/currency";
import { Card } from "@/components/ui/card";

/**
 * The Home hero for tracker mode (budgeting switched off). Where the budget hero
 * leads with "left to spend" -- meaningless without envelope assignment -- this
 * leads with two facts that need no budget: cash across accounts and what others
 * owe you. Both are already computed on the dashboard.
 */
export function TrackerHero({
  cashOnHand,
  accountsCount,
  owedToYou,
  owedByNames,
}: {
  cashOnHand: number;
  accountsCount: number;
  owedToYou: number;
  owedByNames: string[];
}) {
  const owedDetail =
    owedToYou > 0
      ? owedByNames.length > 0
        ? owedByNames.join(", ")
        : "From shared spends"
      : "All settled up";

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
          <p className="text-xs text-muted-foreground">Owed to you</p>
          <p
            className={
              owedToYou > 0
                ? "mt-0.5 text-2xl font-semibold tabular-nums text-primary"
                : "mt-0.5 text-2xl font-semibold tabular-nums"
            }
          >
            {formatRand(owedToYou)}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{owedDetail}</p>
        </Card>
      </Link>
    </section>
  );
}
