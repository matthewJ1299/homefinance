import { formatRand } from "@/lib/utils/currency";

interface PayoffProjectionProps {
  projectedPayoffDate: string;
  projectedMonths: number;
  originalTermMonths?: number;
}

export function PayoffProjection({
  projectedPayoffDate,
  projectedMonths,
  originalTermMonths,
}: PayoffProjectionProps) {
  const monthsSaved = originalTermMonths != null ? Math.max(0, originalTermMonths - projectedMonths) : 0;
  return (
    <div className="rounded-lg border p-4 space-y-2">
      <h3 className="font-semibold">Payoff projection</h3>
      <p className="text-sm">
        <span className="text-muted-foreground">Projected payoff date: </span>
        <span className="font-medium">{projectedPayoffDate}</span>
      </p>
      <p className="text-sm">
        <span className="text-muted-foreground">Projected months: </span>
        <span className="font-medium">{projectedMonths}</span>
      </p>
      {monthsSaved > 0 && (
        <p className="text-sm text-primary font-medium">Months saved: {monthsSaved}</p>
      )}
    </div>
  );
}
