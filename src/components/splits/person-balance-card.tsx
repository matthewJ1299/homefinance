"use client";

import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { AvatarCircle } from "@/components/ui/avatar-circle";
import { Button } from "@/components/ui/button";
import { formatRand } from "@/lib/utils/currency";

export interface PersonBalance {
  userId: number;
  userName: string;
  owedToMe: number;
  iOwe: number;
  net: number;
  itemCount: number;
  lastSettledDate: string | null;
}

/** One card per household member. The overall figure is above; this is the who. */
export function PersonBalanceCard({
  balance: b,
  onSettle,
  onHistory,
}: {
  balance: PersonBalance;
  onSettle: (b: PersonBalance) => void;
  onHistory: (b: PersonBalance) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3.5">
      <AvatarCircle name={b.userName} size={38} />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold">{b.userName}</p>
        <p
          className={cn(
            "text-[13px] font-medium",
            b.net > 0 ? "text-success" : b.net < 0 ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {b.net > 0
            ? `Owes you ${formatRand(b.net)}`
            : b.net < 0
              ? `You owe ${formatRand(-b.net)}`
              : "Settled up"}
        </p>
        <p className="text-xs text-muted-foreground">
          {b.net === 0 && b.lastSettledDate
            ? `Last settled ${format(parseISO(b.lastSettledDate), "d MMM")}`
            : `${b.itemCount} shared spend${b.itemCount === 1 ? "" : "s"}`}
        </p>
      </div>
      <Button
        variant={b.net !== 0 ? "default" : "outline"}
        onClick={() => (b.net !== 0 ? onSettle(b) : onHistory(b))}
        className="h-11 shrink-0 rounded-full px-3.5 text-[13px]"
      >
        {b.net !== 0 ? "Settle" : "History"}
      </Button>
    </div>
  );
}
