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
  /** Everyone on the bond. One band each. */
  people: Array<{ userId: number; name: string }>;
}

/**
 * One band per person. The primary keeps the brand colour; everyone else takes
 * a neutral, so the chart reads the same whether the bond has two people on it
 * or four.
 */
const BAND_COLOURS = ["var(--primary)", "#94a3b8", "var(--success)", "var(--warning)"];

export function EquitySplitChart({ schedule, people }: EquitySplitChartProps) {
  const data = schedule.map((row) => {
    const point: Record<string, number | string> = { month: row.month, date: row.date };
    for (const p of people) {
      point[`u${p.userId}`] = Math.round((row.equityPctByUserId[p.userId] ?? 0) * 100);
    }
    return point;
  });

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
          <Tooltip formatter={(value: number, name: string) => [`${value}%`, name]} />
          <ReferenceLine y={50} stroke="var(--muted-foreground)" strokeDasharray="3 3" />
          {people.map((p, i) => {
            const colour = BAND_COLOURS[i % BAND_COLOURS.length];
            return (
              <Area
                key={p.userId}
                type="monotone"
                dataKey={`u${p.userId}`}
                name={p.name}
                stroke={colour}
                fill={colour}
                fillOpacity={0.4}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
