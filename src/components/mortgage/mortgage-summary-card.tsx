import { formatRand } from "@/lib/utils/currency";

interface MortgageSummaryCardProps {
  monthlyBasePayment: number;
  monthlyTopUp: number;
  monthlyPaymentUserA: number;
  monthlyPaymentUserB: number;
  targetEquityUserAPct: number;
  projectedPayoffDate: string;
  equitySummary: {
    userA: { userId: number; name: string; deposit: number; totalPayments: number; equityPct: number };
    userB: { userId: number; name: string; deposit: number; totalPayments: number; equityPct: number };
  };
  /** Who is reading. Both columns used to be captioned "Your share of the home". */
  meUserId: number;
  currentBalance?: number;
  /** If provided, "months saved" is shown when payoff is earlier than original term. */
  projectedMonths?: number;
  originalTermMonths?: number;
  upcomingAnnualRate?: number;
  upcomingMonthNumber?: number;
}

export function MortgageSummaryCard({
  monthlyBasePayment,
  monthlyTopUp,
  monthlyPaymentUserA,
  monthlyPaymentUserB,
  targetEquityUserAPct,
  projectedPayoffDate,
  equitySummary,
  meUserId,
  currentBalance,
  projectedMonths,
  originalTermMonths,
  upcomingAnnualRate,
  upcomingMonthNumber,
}: MortgageSummaryCardProps) {
  const totalMonthly = monthlyBasePayment + monthlyTopUp;
  const upcomingRatePct =
    upcomingAnnualRate != null
      ? upcomingAnnualRate <= 1
        ? Math.round(upcomingAnnualRate * 1000) / 10
        : upcomingAnnualRate
      : null;
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
        <p className="text-muted-foreground text-xs">Total you pay per month (next payment)</p>
        {upcomingRatePct != null && upcomingMonthNumber != null && (
          <p className="text-muted-foreground text-xs mt-0.5">
            Month {upcomingMonthNumber} rate: {upcomingRatePct}% — minimum{" "}
            {formatRand(monthlyBasePayment)}
          </p>
        )}
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
        {[equitySummary.userA, equitySummary.userB].map((person) => (
          <div key={person.userId} className="flex-1">
            <p className="text-xs text-muted-foreground">{person.name}</p>
            <p className="font-medium">{Math.round(person.equityPct * 100)}%</p>
            <p className="text-muted-foreground text-xs">
              {person.userId === meUserId ? "Your" : `${person.name}’s`} share of the home
            </p>
          </div>
        ))}
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
