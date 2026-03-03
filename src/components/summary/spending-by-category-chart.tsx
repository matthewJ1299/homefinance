"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatRand } from "@/lib/utils/currency";

interface SpendingByCategoryChartProps {
  data: Array<{ categoryName: string; spent: number }>;
}

export function SpendingByCategoryChart({ data }: SpendingByCategoryChartProps) {
  const chartData = data
    .filter((d) => d.spent > 0)
    .map((d) => ({ name: d.categoryName, spent: d.spent / 100 }))
    .sort((a, b) => b.spent - a.spent);

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis type="number" tickFormatter={(v) => `R ${v}`} />
          <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: number) => [formatRand(Math.round(value * 100)), "Spent"]} />
          <Bar dataKey="spent" fill="var(--primary)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
