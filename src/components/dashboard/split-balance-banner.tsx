import Link from "next/link";
import { formatRand } from "@/lib/utils/currency";
import type { SplitBalance } from "@/lib/types";

export function SplitBalanceBanner({
  splitBalance,
  otherUserName,
}: {
  splitBalance: SplitBalance;
  otherUserName?: string;
}) {
  const isOwed = splitBalance.net > 0;
  const amount = Math.abs(splitBalance.net);

  const title = isOwed
    ? `You are owed ${formatRand(amount)}`
    : `You owe ${formatRand(amount)}`;

  return (
    <Link
      href="/splits"
      className="block rounded-xl border bg-card p-3 sm:p-4 text-card-foreground shadow-sm overflow-hidden relative hover:bg-accent/30 transition-colors"
    >
      <div
        className="absolute inset-0 opacity-60 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 15% 30%, rgba(34,197,94,0.22), transparent 55%), radial-gradient(circle at 80% 10%, rgba(99,102,241,0.16), transparent 45%)",
        }}
      />
      <div className="relative">
        <div className="text-xs text-muted-foreground">Split balance</div>
        <div
          className={[
            "mt-2 text-lg sm:text-xl font-semibold",
            isOwed ? "text-primary" : "text-destructive",
          ].join(" ")}
        >
          {splitBalance.net === 0 ? "Split is even" : title}
        </div>
      </div>
    </Link>
  );
}

