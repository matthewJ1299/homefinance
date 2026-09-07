"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatRand } from "@/lib/utils/currency";
import type { AmortisationRow } from "@/lib/types/mortgage.types";

interface AmortisationTableProps {
  schedule: AmortisationRow[];
  /** Everyone on the bond, in the order their columns should appear. */
  people: Array<{ userId: number; name: string }>;
  currentMonth?: number;
}

export function AmortisationTable({ schedule, people, currentMonth }: AmortisationTableProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border p-3 text-left font-semibold hover:bg-muted/50 transition-colors"
        aria-expanded={open}
      >
        <span>Month-by-month breakdown</span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
      </button>
      {open && (
      <>
        <p className="text-xs text-muted-foreground mb-2">Interest, principal and balance each month.</p>
      <div className="h-[400px] overflow-auto rounded border">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-background z-10">
            <tr className="border-b">
              <th className="text-left p-2">#</th>
              <th className="text-left p-2">Date</th>
              <th className="text-right p-2">Opening</th>
              <th className="text-right p-2">Interest</th>
              <th className="text-right p-2">Principal</th>
              {/* A column per person rather than two named A and B, so a third
                  person on the bond is not silently missing from the table. */}
              {people.map((p) => (
                <th key={`pay-${p.userId}`} className="text-right p-2">
                  {p.name}
                </th>
              ))}
              {people.map((p) => (
                <th key={`pct-${p.userId}`} className="text-right p-2">
                  {p.name} %
                </th>
              ))}
              <th className="text-right p-2">Closing</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((row) => {
              const isCurrent = currentMonth != null && row.month === currentMonth;
              return (
                <tr key={row.month} className={isCurrent ? "border-b bg-primary/10" : "border-b"}>
                  <td className="p-2">{row.month}</td>
                  <td className="p-2">{row.date}</td>
                  <td className="p-2 text-right">{formatRand(row.openingBalance)}</td>
                  <td className="p-2 text-right">{formatRand(row.interest)}</td>
                  <td className="p-2 text-right">{formatRand(row.principal)}</td>
                  {people.map((p) => (
                    <td key={`pay-${p.userId}`} className="p-2 text-right">
                      {formatRand(row.paymentByUserId[p.userId] ?? 0)}
                    </td>
                  ))}
                  {people.map((p) => (
                    <td key={`pct-${p.userId}`} className="p-2 text-right">
                      {Math.round((row.equityPctByUserId[p.userId] ?? 0) * 100)}%
                    </td>
                  ))}
                  <td className="p-2 text-right">{formatRand(row.closingBalance)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </>
      )}
    </div>
  );
}
