"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { AmortisationRow } from "@/lib/types/mortgage.types";

interface EquitySplitChartProps {
  schedule: AmortisationRow[];
  userAName: string;
  userBName: string;
}

export function EquitySplitChart({ schedule, userAName, userBName }: EquitySplitChartProps) {
  const data = schedule.map((row) => ({
    month: row.month,
    date: row.date,
    userA: Math.round(row.userACumulativeEquityPct * 100),
    userB: Math.round(row.userBCumulativeEquityPct * 100),
  }));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
          <Tooltip formatter={(value: number) => [`${value}%`, ""]} />
          <ReferenceLine y={50} stroke="var(--muted-foreground)" strokeDasharray="3 3" />
          <Area type="monotone" dataKey="userA" name={userAName} stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.4} />
          <Area type="monotone" dataKey="userB" name={userBName} stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.4} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
