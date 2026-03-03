import { formatRand } from "@/lib/utils/currency";

interface MortgageSummaryCardProps {
  monthlyBasePayment: number;
  monthlyTopUp: number;
  monthlyPaymentUserA: number;
  monthlyPaymentUserB: number;
  targetEquityUserAPct: number;
  projectedPayoffDate: string;
  equitySummary: {
    userA: { name: string; deposit: number; totalPayments: number; equityPct: number };
    userB: { name: string; deposit: number; totalPayments: number; equityPct: number };
  };
  currentBalance?: number;
}

export function MortgageSummaryCard({
  monthlyBasePayment,
  monthlyTopUp,
  monthlyPaymentUserA,
  monthlyPaymentUserB,
  targetEquityUserAPct,
  projectedPayoffDate,
  equitySummary,
  currentBalance,
}: MortgageSummaryCardProps) {
  const totalMonthly = monthlyBasePayment + monthlyTopUp;
  const targetA = Math.round(targetEquityUserAPct * 100);
  const targetB = 100 - targetA;
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h3 className="font-semibold">Mortgage summary</h3>
      {currentBalance != null && (
        <p className="text-sm">
          <span className="text-muted-foreground">Current balance: </span>
          <span className="font-medium">{formatRand(currentBalance)}</span>
        </p>
      )}
      <p className="text-sm">
        <span className="text-muted-foreground">Monthly base: </span>
        <span className="font-medium">{formatRand(monthlyBasePayment)}</span>
      </p>
      <p className="text-sm">
        <span className="text-muted-foreground">Monthly top-up: </span>
        <span className="font-medium">{formatRand(monthlyTopUp)}</span>
      </p>
      <p className="text-sm">
        <span className="text-muted-foreground">Total monthly: </span>
        <span className="font-medium">{formatRand(totalMonthly)}</span>
      </p>
      <p className="text-sm font-medium text-muted-foreground">
        To reach {targetA}% / {targetB}% equity:
      </p>
      <p className="text-sm pl-2">
        <span className="text-muted-foreground">{equitySummary.userA.name}: </span>
        <span className="font-medium">{formatRand(monthlyPaymentUserA)}</span>
      </p>
      <p className="text-sm pl-2">
        <span className="text-muted-foreground">{equitySummary.userB.name}: </span>
        <span className="font-medium">{formatRand(monthlyPaymentUserB)}</span>
      </p>
      <p className="text-sm">
        <span className="text-muted-foreground">Projected payoff: </span>
        <span className="font-medium">{projectedPayoffDate}</span>
      </p>
      <div className="flex gap-4 pt-2 border-t">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{equitySummary.userA.name}</p>
          <p className="font-medium">{Math.round(equitySummary.userA.equityPct * 100)}% equity</p>
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{equitySummary.userB.name}</p>
          <p className="font-medium">{Math.round(equitySummary.userB.equityPct * 100)}% equity</p>
        </div>
      </div>
    </div>
  );
}
