import { ChevronDown } from "lucide-react";
import { formatRand } from "@/lib/utils/currency";
import { formatDisplayDate } from "@/lib/utils/date";
import type { OwedLineItemRow } from "@/lib/repositories/interfaces/split-allocation.repository";

interface StatementTotalsProps {
  lineItems: OwedLineItemRow[];
  lineItemsTotal: number;
  subtotalLabel: string;
  contraTotal: number;
  contraLabel: string;
  splitNet: number;
  mortgageAmount: number;
  mortgageLabel: string;
  /** False when this person is not on the bond -- the row is left out entirely. */
  showMortgage?: boolean;
}

export function StatementTotals({
  lineItems,
  lineItemsTotal,
  subtotalLabel,
  contraTotal,
  contraLabel,
  splitNet,
  mortgageAmount,
  mortgageLabel,
  showMortgage = true,
}: StatementTotalsProps) {
  const total = splitNet + (showMortgage ? mortgageAmount : 0);
  const hasContra = contraTotal > 0;

  return (
    <div className="rounded-lg border bg-card">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
          <span className="font-medium">Split balance</span>
          <span className="ml-auto tabular-nums font-medium">{formatRand(splitNet)}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 print:hidden" />
        </summary>
        <div className="border-t border-border px-4 py-3">
          {lineItems.length === 0 && !hasContra ? (
            <p className="text-sm text-muted-foreground">No split costs in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium whitespace-nowrap">Date</th>
                    <th className="py-2 pr-3 font-medium">Description</th>
                    <th className="py-2 font-medium text-right whitespace-nowrap">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item) => (
                    <tr key={item.expenseId} className="border-b border-border/60">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {formatDisplayDate(item.date)}
                      </td>
                      <td className="py-2 pr-3">
                        {item.note?.trim() || item.categoryName || "—"}
                      </td>
                      <td className="py-2 text-right tabular-nums whitespace-nowrap">
                        {formatRand(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  {hasContra ? (
                    <>
                      {lineItems.length > 0 ? (
                        <tr className="text-muted-foreground">
                          <td className="py-2 pr-3" colSpan={2}>
                            {subtotalLabel}
                          </td>
                          <td className="py-2 text-right tabular-nums whitespace-nowrap">
                            {formatRand(lineItemsTotal)}
                          </td>
                        </tr>
                      ) : null}
                      <tr className="text-muted-foreground">
                        <td className="py-2 pr-3" colSpan={2}>
                          {contraLabel}
                        </td>
                        <td className="py-2 text-right tabular-nums whitespace-nowrap">
                          -{formatRand(contraTotal)}
                        </td>
                      </tr>
                    </>
                  ) : null}
                  <tr className="font-medium">
                    <td className="py-2 pr-3" colSpan={2}>
                      Net split
                    </td>
                    <td className="py-2 text-right tabular-nums whitespace-nowrap">
                      {formatRand(splitNet)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </details>
      {showMortgage ? (
        <div className="flex items-center justify-between gap-2 border-t px-4 py-3 text-sm">
          <span className="font-medium">{mortgageLabel}</span>
          <span className="tabular-nums font-medium">{formatRand(mortgageAmount)}</span>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-2 border-t px-4 py-4 text-base font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{formatRand(total)}</span>
      </div>
    </div>
  );
}
