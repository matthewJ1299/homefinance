import { formatRand } from "@/lib/utils/currency";

interface MonthlySnapshotProps {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  netPosition: number;
  expensesByUser: Record<number, number>;
  incomeByUser: Record<number, number>;
  userNames?: Record<number, string>;
}

export function MonthlySnapshot({
  month,
  totalIncome,
  totalExpenses,
  netPosition,
  expensesByUser,
  incomeByUser,
  userNames = {},
}: MonthlySnapshotProps) {
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">Total income</p>
        <p className="text-2xl font-semibold">{formatRand(totalIncome)}</p>
      </div>
      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">Total expenses</p>
        <p className="text-2xl font-semibold">{formatRand(totalExpenses)}</p>
      </div>
      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">Net position</p>
        <p className={`text-2xl font-semibold ${netPosition >= 0 ? "text-primary" : "text-destructive"}`}>
          {formatRand(netPosition)}
        </p>
      </div>
      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">Savings rate</p>
        <p className="text-2xl font-semibold">{savingsRate.toFixed(1)}%</p>
      </div>
      <div className="rounded-lg border p-4 md:col-span-2">
        <p className="text-sm font-medium mb-2">By user</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {Object.entries(incomeByUser).map(([userId, amount]) => (
            <div key={userId}>
              <span className="text-muted-foreground">{userNames[Number(userId)] ?? `User ${userId}`}: </span>
              <span className="font-medium">{formatRand(amount)} income</span>
              {expensesByUser[Number(userId)] != null && (
                <span className="block text-muted-foreground">{formatRand(expensesByUser[Number(userId)])} expenses</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
