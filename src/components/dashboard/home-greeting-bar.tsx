import { format } from "date-fns";
import { formatBudgetMonthLabel } from "@/lib/utils/date";
import { AvatarCircle } from "@/components/ui/avatar-circle";
import { formatRand } from "@/lib/utils/currency";

function getFirstName(name: string | undefined | null): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/g)[0] ?? "there";
}

export function HomeGreetingBar({
  month,
  budgetMonthStartDay = 1,
  userName,
  otherUserName,
  monthBalanceCents,
}: {
  month: string;
  /** Matches Settings > Budget month range (default 1 = calendar month). */
  budgetMonthStartDay?: number;
  userName: string;
  otherUserName?: string;
  /** Optional: month-to-date balance hint under the greeting. */
  monthBalanceCents?: number;
}) {
  const monthLabel = formatBudgetMonthLabel(month, budgetMonthStartDay).toUpperCase();
  const firstName = getFirstName(userName);
  const todayLine = format(new Date(), "EEEE, MMMM d");

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground">
            {monthLabel}
          </div>
          <div className="text-xs text-muted-foreground">{todayLine}</div>
          <div className="pt-1 text-2xl sm:text-3xl font-semibold tracking-tight">
            Good morning, {firstName}
          </div>
          {monthBalanceCents != null ? (
            <p className="text-sm text-muted-foreground pt-1">
              Month balance{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatRand(monthBalanceCents)}
              </span>
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <AvatarCircle name={userName} size={40} />
          {otherUserName ? <AvatarCircle name={otherUserName} size={40} /> : null}
        </div>
      </div>
    </section>
  );
}

