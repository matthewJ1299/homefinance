"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatRand } from "@/lib/utils/currency";

interface MonthData {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  netPosition: number;
}

interface IncomeVsExpensesChartProps {
  data: MonthData[];
}

export function IncomeVsExpensesChart({ data }: IncomeVsExpensesChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    incomeRands: d.totalIncome / 100,
    expensesRands: d.totalExpenses / 100,
    netRands: d.netPosition / 100,
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R ${v}`} />
          <Tooltip
            formatter={(value: number) => [formatRand(Math.round(value * 100)), ""]}
            labelFormatter={(label) => label}
          />
          <Legend />
          <Bar dataKey="incomeRands" name="Income" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expensesRands" name="Expenses" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="netRands" name="Net" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
