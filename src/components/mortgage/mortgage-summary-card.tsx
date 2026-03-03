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
  /** If provided, "months saved" is shown when payoff is earlier than original term. */
  projectedMonths?: number;
  originalTermMonths?: number;
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
  projectedMonths,
  originalTermMonths,
}: MortgageSummaryCardProps) {
  const totalMonthly = monthlyBasePayment + monthlyTopUp;
  const monthsSaved =
    originalTermMonths != null && projectedMonths != null
      ? Math.max(0, originalTermMonths - projectedMonths)
      : 0;

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h2 className="font-semibold text-base">At a glance</h2>
      {currentBalance != null && (
        <div className="text-sm">
          <p className="font-medium">{formatRand(currentBalance)}</p>
          <p className="text-muted-foreground text-xs">What you still owe (amount left on the loan)</p>
        </div>
      )}
      <div className="text-sm">
        <p className="font-medium">{formatRand(totalMonthly)}</p>
        <p className="text-muted-foreground text-xs">Total you pay per month</p>
        {monthlyTopUp > 0 && (
          <p className="text-muted-foreground text-xs mt-0.5">
            Minimum: {formatRand(monthlyBasePayment)} + extra: {formatRand(monthlyTopUp)}
          </p>
        )}
      </div>
      <div className="text-sm">
        <p className="font-medium">{projectedPayoffDate}</p>
        <p className="text-muted-foreground text-xs">When you&apos;ll be done paying</p>
        {monthsSaved > 0 && (
          <p className="text-primary font-medium text-xs mt-0.5">Months saved vs original term: {monthsSaved}</p>
        )}
      </div>
      <div className="flex gap-4 pt-2 border-t">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{equitySummary.userA.name}</p>
          <p className="font-medium">{Math.round(equitySummary.userA.equityPct * 100)}%</p>
          <p className="text-muted-foreground text-xs">Your share of the home</p>
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{equitySummary.userB.name}</p>
          <p className="font-medium">{Math.round(equitySummary.userB.equityPct * 100)}%</p>
          <p className="text-muted-foreground text-xs">Your share of the home</p>
        </div>
      </div>
      <div className="pt-2 border-t text-sm">
        <p className="text-muted-foreground text-xs mb-1">To keep ownership fair (so you each end up with the share you agreed):</p>
        <p className="pl-0">
          <span className="text-muted-foreground">{equitySummary.userA.name}: </span>
          <span className="font-medium">{formatRand(monthlyPaymentUserA)}</span>
        </p>
        <p className="pl-0">
          <span className="text-muted-foreground">{equitySummary.userB.name}: </span>
          <span className="font-medium">{formatRand(monthlyPaymentUserB)}</span>
        </p>
      </div>
    </div>
  );
}
