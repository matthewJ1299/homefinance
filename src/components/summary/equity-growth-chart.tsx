"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatRand } from "@/lib/utils/currency";

interface EquityPoint {
  month: number;
  date: string;
  userAEquity: number;
  userBEquity: number;
}

interface EquityGrowthChartProps {
  data: EquityPoint[];
  userAName: string;
  userBName: string;
}

export function EquityGrowthChart({ data, userAName, userBName }: EquityGrowthChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    userARands: d.userAEquity / 100,
    userBRands: d.userBEquity / 100,
  }));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R ${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            formatter={(value: number) => [formatRand(Math.round(value * 100)), ""]}
            labelFormatter={(_, payload) => payload[0]?.payload?.date ?? ""}
          />
          <Legend />
          <Line type="monotone" dataKey="userARands" name={userAName} stroke="var(--primary)" strokeWidth={2} dot={{ r: 2 }} />
          <Line type="monotone" dataKey="userBRands" name={userBName} stroke="#94a3b8" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
