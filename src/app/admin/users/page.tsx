import Link from "next/link";
import { AdminHouseholdRepository } from "@/lib/repositories/sql/admin-household.repository";
import { AdminUserRepository } from "@/lib/repositories/sql/admin-user.repository";
import {
  adminCreateHouseholdAndOwner,
  adminCreateUserInHousehold,
  adminMoveUserHouseholdFormAction,
  adminSetUserSuperAdmin,
} from "@/lib/actions/admin/admin-user.actions";
import { AdminResetPasswordButton } from "@/components/admin/admin-reset-password-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; householdId?: string }>;
}) {
  const params = await searchParams;
  const search = params.search?.trim() ?? "";
  const householdFilter =
    params.householdId != null && params.householdId !== ""
      ? Number(params.householdId)
      : undefined;

  const householdRepo = new AdminHouseholdRepository();
  const userRepo = new AdminUserRepository();
  const [households, users] = await Promise.all([
    householdRepo.listHouseholds(),
    userRepo.listUsers({
      search: search || undefined,
      householdId:
        householdFilter != null && Number.isFinite(householdFilter) ? householdFilter : undefined,
    }),
  ]);

  const householdNameById = new Map(households.map((h) => [h.id, h.name]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground">
          Create users, move them between households, reset passwords, and manage super-admin access.
          Feature entitlements are configured per household on{" "}
          <Link href="/admin/houses" className="text-primary hover:underline">
            Houses
          </Link>
          .
        </p>
      </div>

      <section className="rounded-lg border p-4 space-y-3">
        <div className="font-medium">Create house + owner user</div>
        <p className="text-sm text-muted-foreground">
          Leave password blank to auto-generate a temporary password (user must change it on first
          sign-in).
        </p>
        <form action={adminCreateHouseholdAndOwner} className="grid gap-3 md:grid-cols-4">
          <div>
            <div className="text-sm mb-1">House name</div>
            <Input name="householdName" placeholder="Smith household" required />
          </div>
          <div>
            <div className="text-sm mb-1">Owner name</div>
            <Input name="ownerName" placeholder="Alex Smith" required />
          </div>
          <div>
            <div className="text-sm mb-1">Owner email</div>
            <Input name="ownerEmail" type="email" placeholder="alex@example.com" required />
          </div>
          <div>
            <div className="text-sm mb-1">Owner password (optional)</div>
            <Input type="password" name="ownerPassword" placeholder="Auto-generate if empty" minLength={10} />
          </div>
          <div className="md:col-span-4">
            <Button type="submit">Create</Button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border p-4 space-y-3">
        <div className="font-medium">Create user in existing house</div>
        <form action={adminCreateUserInHousehold} className="grid gap-3 md:grid-cols-4">
          <SelectField label="House" name="householdId" defaultValue={households[0]?.id ?? ""} required>
            {households.map((h) => (
              <option key={h.id} value={h.id}>
                {h.id} - {h.name} ({h.approvalStatus})
              </option>
            ))}
          </SelectField>
          <div>
            <div className="text-sm mb-1">Name</div>
            <Input name="name" placeholder="Jamie Smith" required />
          </div>
          <div>
            <div className="text-sm mb-1">Email</div>
            <Input name="email" type="email" placeholder="jamie@example.com" required />
          </div>
          <div>
            <div className="text-sm mb-1">Password (optional)</div>
            <Input type="password" name="password" placeholder="Auto-generate if empty" minLength={10} />
          </div>
          <div className="md:col-span-4">
            <Button type="submit" disabled={households.length === 0}>
              Create
            </Button>
            {households.length === 0 && (
              <span className="ml-3 text-sm text-muted-foreground">Create a house first.</span>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-lg border p-4 space-y-3">
        <div className="font-medium">Filter users</div>
        <form method="get" className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[12rem]">
            <div className="text-sm mb-1">Search</div>
            <Input name="search" defaultValue={search} placeholder="Name or email" />
          </div>
          <SelectField
            label="Household"
            name="householdId"
            defaultValue={householdFilter ?? ""}
            className="min-w-[12rem]"
          >
            <option value="">All households</option>
            {households.map((h) => (
              <option key={h.id} value={h.id}>
                {h.id} - {h.name}
              </option>
            ))}
          </SelectField>
          <Button type="submit" variant="secondary">
            Apply
          </Button>
        </form>
      </section>

      <section className="rounded-lg border overflow-x-auto">
        <div className="p-4 border-b font-medium">Users ({users.length})</div>
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-b">
            <tr>
              <th className="text-left p-3">Id</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Household</th>
              <th className="text-left p-3">Must change pwd</th>
              <th className="text-left p-3">Super admin</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-b-0 align-top">
                <td className="p-3">{u.id}</td>
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">
                  <Link href={`/admin/houses/${u.householdId}`} className="text-primary hover:underline">
                    {householdNameById.get(u.householdId) ?? u.householdId}
                  </Link>
                </td>
                <td className="p-3">{u.mustChangePassword ? "Yes" : "No"}</td>
                <td className="p-3">
                  <form action={adminSetUserSuperAdmin} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={u.id} />
                    <Checkbox name="isSuperAdmin" defaultChecked={u.isSuperAdmin} />
                    <Button type="submit" size="sm" variant="secondary">
                      Save
                    </Button>
                  </form>
                </td>
                <td className="p-3 space-y-2">
                  <AdminResetPasswordButton userId={u.id} userName={u.name} />
                  <form action={adminMoveUserHouseholdFormAction} className="flex items-end gap-2">
                    <input type="hidden" name="userId" value={u.id} />
                    <SelectField name="householdId" defaultValue={u.householdId} className="min-w-[10rem]">
                      {households.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </SelectField>
                    <Button type="submit" size="sm" variant="outline">
                      Move
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td className="p-4 text-muted-foreground" colSpan={7}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
