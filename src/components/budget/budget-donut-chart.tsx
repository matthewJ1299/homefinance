"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { formatRand } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

export function BudgetDonutChart({
  allocated,
  spent,
  className,
}: {
  allocated: number;
  spent: number;
  className?: string;
}) {
  const remaining = allocated - spent;
  const isOverspent = spent > allocated;
  const remainingClamped = Math.max(0, remaining);

  const data = [
    { key: "spent", value: Math.max(0, spent) },
    { key: "remaining", value: remainingClamped },
  ];

  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6", className)}>
      <div className="relative mx-auto h-32 w-32 shrink-0 sm:mx-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={48}
              outerRadius={62}
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              <Cell fill="var(--destructive)" />
              <Cell fill="var(--primary)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1">
          <div className="text-[10px] text-muted-foreground leading-tight">Total budget</div>
          <div className="text-sm font-semibold leading-tight mt-0.5">{formatRand(allocated)}</div>
        </div>
      </div>
      <div className="flex-1 space-y-2 min-w-0 text-center sm:text-left">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Overview
        </div>
        <div className="text-2xl font-semibold tabular-nums">{formatRand(allocated)}</div>
        <div className="flex flex-col gap-1 text-sm sm:flex-row sm:flex-wrap sm:gap-x-4">
          <span className={cn(isOverspent ? "text-destructive font-medium" : "text-foreground")}>
            Spent {formatRand(spent)}
          </span>
          <span className="text-primary font-medium">Remaining {formatRand(remaining)}</span>
        </div>
      </div>
    </div>
  );
}

