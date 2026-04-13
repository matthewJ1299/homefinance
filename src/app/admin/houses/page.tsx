import { AdminHouseholdRepository } from "@/lib/repositories/sql/admin-household.repository";
import { adminCreateHousehold, adminUpdateHouseholdPolicy } from "@/lib/actions/admin/admin-household.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

export default async function AdminHousesPage() {
  const repo = new AdminHouseholdRepository();
  const households = await repo.listHouseholds();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Houses</h1>
        <p className="text-sm text-muted-foreground">
          Create and manage household tenants and their feature policy.
        </p>
      </div>

      <section className="rounded-lg border p-4 space-y-3">
        <div className="font-medium">Create house</div>
        <form action={adminCreateHousehold} className="flex gap-3 items-end">
          <div className="flex-1">
            <div className="text-sm mb-1">Name</div>
            <Input name="name" placeholder="Smith household" />
          </div>
          <Button type="submit">Create</Button>
        </form>
      </section>

      <section className="rounded-lg border">
        <div className="p-4 border-b font-medium">Existing houses</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="text-left p-3">Id</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">AI allowed</th>
                <th className="text-left p-3">Recon allowed</th>
                <th className="text-left p-3">Update</th>
              </tr>
            </thead>
            <tbody>
              {households.map((h) => (
                <tr key={h.id} className="border-b last:border-b-0">
                  <td className="p-3">{h.id}</td>
                  <td className="p-3">{h.name}</td>
                  <td className="p-3">{h.aiFeatureAllowed ? "Yes" : "No"}</td>
                  <td className="p-3">{h.reconFeatureAllowed ? "Yes" : "No"}</td>
                  <td className="p-3">
                    <form action={adminUpdateHouseholdPolicy} className="flex items-center gap-2">
                      <input type="hidden" name="householdId" value={h.id} />
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="aiFeatureAllowed"
                          defaultChecked={h.aiFeatureAllowed}
                        />
                        <span>AI</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="reconFeatureAllowed"
                          defaultChecked={h.reconFeatureAllowed}
                        />
                        <span>Recon</span>
                      </label>
                      <Button type="submit" variant="secondary" size="sm">
                        Save
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
              {households.length === 0 && (
                <tr>
                  <td className="p-4 text-muted-foreground" colSpan={5}>
                    No houses yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

