import Link from "next/link";

import { AdminHouseholdRepository } from "@/lib/repositories/sql/admin-household.repository";

import { FEATURES } from "@/lib/features/registry";

import { adminCreateHouseholdFormAction } from "@/lib/actions/admin/admin-household.actions";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";



export const dynamic = "force-dynamic";



function EntitlementChips({ keys }: { keys: readonly string[] }) {

  if (keys.length === 0) {

    return <span className="text-muted-foreground">None</span>;

  }

  return (

    <div className="flex flex-wrap gap-1">

      {keys.map((key) => {

        const label = FEATURES[key as keyof typeof FEATURES]?.label ?? key;

        return (

          <span

            key={key}

            className="inline-flex rounded-md border bg-muted/50 px-2 py-0.5 text-xs font-medium"

          >

            {label}

          </span>

        );

      })}

    </div>

  );

}



export default async function AdminHousesPage() {

  const households = await new AdminHouseholdRepository().listHouseholds();



  return (

    <div className="space-y-8">

      <div>

        <h1 className="text-2xl font-semibold">Houses</h1>

        <p className="text-sm text-muted-foreground">

          Manage household tenants, approval status, and entitlements.

        </p>

      </div>



      <section className="rounded-lg border p-4 space-y-3">

        <div className="font-medium">Create house</div>

        <form action={adminCreateHouseholdFormAction} className="flex gap-3 items-end">

          <div className="flex-1">

            <div className="text-sm mb-1">Name</div>

            <Input name="name" placeholder="Smith household" />

          </div>

          <Button type="submit">Create</Button>

        </form>

      </section>



      <section className="rounded-lg border overflow-x-auto">

        <table className="w-full text-sm">

          <thead className="text-muted-foreground border-b">

            <tr>

              <th className="text-left p-3">Id</th>

              <th className="text-left p-3">Name</th>

              <th className="text-left p-3">Members</th>

              <th className="text-left p-3">Status</th>

              <th className="text-left p-3">AI tier</th>

              <th className="text-left p-3">Entitlements</th>

            </tr>

          </thead>

          <tbody>

            {households.map((h) => (

              <tr key={h.id} className="border-b last:border-b-0">

                <td className="p-3">{h.id}</td>

                <td className="p-3">

                  <Link href={`/admin/houses/${h.id}`} className="text-primary hover:underline">

                    {h.name}

                  </Link>

                  {h.approvalStatus === "pending" ? (

                    <span className="ml-2 inline-flex rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">

                      Pending

                    </span>

                  ) : null}

                </td>

                <td className="p-3">{h.memberCount}</td>

                <td className="p-3">

                  {h.approvalStatus === "pending" ? (

                    <span className="text-amber-600">Pending</span>

                  ) : h.approvalStatus === "rejected" ? (

                    <span className="text-destructive">Rejected</span>

                  ) : (

                    "Active"

                  )}

                </td>

                <td className="p-3 capitalize">{h.aiTier}</td>

                <td className="p-3">

                  <EntitlementChips keys={h.enabledFeatureKeys} />

                </td>

              </tr>

            ))}

            {households.length === 0 && (

              <tr>

                <td className="p-4 text-muted-foreground" colSpan={6}>

                  No households yet.

                </td>

              </tr>

            )}

          </tbody>

        </table>

      </section>

    </div>

  );

}

