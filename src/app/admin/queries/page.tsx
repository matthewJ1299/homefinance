import { AdminReportingRepository } from "@/lib/repositories/sql/admin-reporting.repository";

export const dynamic = "force-dynamic";

export default async function AdminQueriesPage() {
  const repo = new AdminReportingRepository();
  const counts = await repo.getOverviewCounts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Queries</h1>
        <p className="text-sm text-muted-foreground">
          Read-only operational queries (allowlisted).
        </p>
      </div>

      <section className="rounded-lg border">
        <div className="p-4 border-b font-medium">Overview</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 text-sm">
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground">Households</div>
            <div className="text-xl font-semibold">{counts.households}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground">Users</div>
            <div className="text-xl font-semibold">{counts.users}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground">Accounts</div>
            <div className="text-xl font-semibold">{counts.accounts}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground">Expenses</div>
            <div className="text-xl font-semibold">{counts.expenses}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground">Income</div>
            <div className="text-xl font-semibold">{counts.income}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground">Transfers</div>
            <div className="text-xl font-semibold">{counts.transfers}</div>
          </div>
        </div>
        <div className="px-4 pb-4 text-xs text-muted-foreground">
          Endpoint: <code>/api/admin/queries/overview</code>
        </div>
      </section>
    </div>
  );
}

