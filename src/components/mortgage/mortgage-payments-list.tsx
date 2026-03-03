import { formatRand } from "@/lib/utils/currency";
import type { MortgagePaymentRow } from "@/lib/repositories/interfaces/mortgage.repository";

interface MortgagePaymentsListProps {
  payments: MortgagePaymentRow[];
  userNameById: Map<number, string>;
}

export function MortgagePaymentsList({ payments, userNameById }: MortgagePaymentsListProps) {
  const sorted = [...payments].sort(
    (a, b) => b.paymentDate.localeCompare(a.paymentDate) || b.id - a.id
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border p-4">
        <h2 className="font-semibold text-base mb-2">Payments made</h2>
        <p className="text-sm text-muted-foreground">
          No payments recorded yet. Set up your mortgage first (see form in More details below if needed).
          Then add an expense with category Mortgage on the Expenses page; it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <h2 className="font-semibold text-base mb-2">Payments made</h2>
      <ul className="space-y-2 text-sm">
        {sorted.map((p) => (
          <li key={p.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-border/50 pb-2 last:border-0">
            <span className="text-muted-foreground">{p.paymentDate}</span>
            <span className="font-medium">{formatRand(p.amount)}</span>
            <span className="text-muted-foreground">{userNameById.get(p.userId) ?? `User ${p.userId}`}</span>
            <span className="text-xs text-muted-foreground">
              {p.isExtraPayment ? "Extra" : "Payment"}
            </span>
            {p.note && <span className="w-full text-xs text-muted-foreground truncate" title={p.note}>{p.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
