import Link from "next/link";

import { notFound } from "next/navigation";

import { AdminHouseholdRepository } from "@/lib/repositories/sql/admin-household.repository";

import { AdminUserRepository } from "@/lib/repositories/sql/admin-user.repository";

import { FEATURE_LIST } from "@/lib/features/registry";

import {
  adminRenameHouseholdFormAction,
  adminSetHouseholdApprovalFormAction,
  adminUpdateHouseholdEntitlementsFormAction,
} from "@/lib/actions/admin/admin-household.actions";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Checkbox } from "@/components/ui/checkbox";

import { SelectField } from "@/components/ui/select-field";



export const dynamic = "force-dynamic";



export default async function AdminHouseDetailPage({

  params,

}: {

  params: Promise<{ id: string }>;

}) {

  const householdId = Number((await params).id);

  if (!Number.isFinite(householdId)) notFound();



  const householdRepo = new AdminHouseholdRepository();

  const household = await householdRepo.getHousehold(householdId);

  if (!household) notFound();



  const members = await new AdminUserRepository().listUsers({ householdId });

  const enabledSet = new Set(household.enabledFeatureKeys);



  return (

    <div className="space-y-8">

      <div>

        <Link href="/admin/houses" className="text-sm text-muted-foreground hover:underline">

          Back to houses

        </Link>

        <h1 className="text-2xl font-semibold mt-2">{household.name}</h1>

        <p className="text-sm text-muted-foreground">

          {household.memberCount} member{household.memberCount === 1 ? "" : "s"} ·{" "}

          {household.approvalStatus}

        </p>

      </div>



      {household.approvalStatus === "pending" && (

        <section className="rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 p-4 flex flex-wrap gap-3 items-center">

          <span className="text-sm">This household is waiting for approval.</span>

          <form action={adminSetHouseholdApprovalFormAction}>

            <input type="hidden" name="householdId" value={householdId} />

            <input type="hidden" name="status" value="active" />

            <Button type="submit" size="sm">

              Approve

            </Button>

          </form>

          <form action={adminSetHouseholdApprovalFormAction}>

            <input type="hidden" name="householdId" value={householdId} />

            <input type="hidden" name="status" value="rejected" />

            <Button type="submit" size="sm" variant="destructive">

              Reject

            </Button>

          </form>

        </section>

      )}



      <section className="rounded-lg border p-4 space-y-3">

        <div className="font-medium">Rename</div>

        <form action={adminRenameHouseholdFormAction} className="flex gap-3 items-end">

          <input type="hidden" name="householdId" value={householdId} />

          <Input name="name" defaultValue={household.name} className="max-w-md" />

          <Button type="submit" variant="secondary">

            Save name

          </Button>

        </form>

      </section>



      <section className="rounded-lg border p-4 space-y-4">

        <div className="font-medium">Feature entitlements</div>

        <form action={adminUpdateHouseholdEntitlementsFormAction} className="space-y-4">

          <input type="hidden" name="householdId" value={householdId} />

          <div className="grid gap-3 sm:grid-cols-2">

            {FEATURE_LIST.map((f) => (

              <label key={f.key} className="flex items-start gap-2 text-sm">

                <Checkbox name={`feature_${f.key}`} defaultChecked={enabledSet.has(f.key)} />

                <span>

                  <span className="font-medium">{f.label}</span>

                  <span className="block text-muted-foreground">{f.description}</span>

                </span>

              </label>

            ))}

          </div>

          <SelectField

            label="AI tier"

            name="aiTier"

            defaultValue={household.aiTier}

            className="max-w-xs"

          >

            <option value="free">Free</option>

            <option value="paid">Paid</option>

          </SelectField>

          <Button type="submit">Save entitlements</Button>

        </form>

      </section>



      <section className="rounded-lg border p-4">

        <div className="font-medium mb-3">Members</div>

        <div className="overflow-x-auto">

          <table className="w-full text-sm">

            <thead className="text-muted-foreground border-b">

              <tr>

                <th className="text-left p-2">Name</th>

                <th className="text-left p-2">Email</th>

                <th className="text-left p-2">Role</th>

              </tr>

            </thead>

            <tbody>

              {members.map((m) => (

                <tr key={m.id} className="border-b last:border-b-0">

                  <td className="p-2">{m.name}</td>

                  <td className="p-2">{m.email}</td>

                  <td className="p-2">{m.isSuperAdmin ? "Super admin" : "Member"}</td>

                </tr>

              ))}

              {members.length === 0 && (

                <tr>

                  <td className="p-2 text-muted-foreground" colSpan={3}>

                    No members

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

