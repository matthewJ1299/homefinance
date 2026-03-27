import Link from "next/link";
import { CalendarDays, CheckCircle2, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export function HomeStatsStrip({
  tasksOpen,
  eventsToday,
  budgetBalanceLabel,
}: {
  tasksOpen: number;
  eventsToday: number;
  budgetBalanceLabel: string;
}) {
  const cards = [
    {
      href: "/lists",
      label: "Tasks",
      value: String(tasksOpen),
      icon: CheckCircle2,
      iconClass: "bg-primary/15 text-primary",
    },
    {
      href: "/calendar",
      label: "Events",
      value: String(eventsToday),
      icon: CalendarDays,
      iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    },
    {
      href: "/budget",
      label: "Budget",
      value: budgetBalanceLabel,
      icon: Wallet,
      iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    },
  ] as const;

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {cards.map(({ href, label, value, icon: Icon, iconClass }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "rounded-2xl border border-border/60 bg-card/90 p-2.5 sm:p-3 shadow-sm flex flex-col items-center text-center gap-2",
            "transition-colors hover:bg-accent/20 active:scale-[0.98] cursor-pointer min-h-[5.25rem] sm:min-h-[5.5rem] justify-center"
          )}
        >
          <div
            className={cn(
              "flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full",
              iconClass
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="text-sm sm:text-base font-semibold tabular-nums leading-tight max-w-full truncate px-0.5">
            {value}
          </div>
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </div>
        </Link>
      ))}
    </div>
  );
}
