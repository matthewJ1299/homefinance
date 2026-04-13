import { AdminHouseholdRepository } from "@/lib/repositories/sql/admin-household.repository";
import { AdminUserRepository } from "@/lib/repositories/sql/admin-user.repository";
import {
  adminCreateHouseholdAndOwner,
  adminCreateUserInHousehold,
  adminSetUserFeatureAccess,
  adminSetUserSuperAdmin,
} from "@/lib/actions/admin/admin-user.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const householdRepo = new AdminHouseholdRepository();
  const userRepo = new AdminUserRepository();
  const [households, users] = await Promise.all([
    householdRepo.listHouseholds(),
    userRepo.listUsers(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground">
          Create users, allocate them to a house, and manage access.
        </p>
      </div>

      <section className="rounded-lg border p-4 space-y-3">
        <div className="font-medium">Create house + owner user</div>
        <form action={adminCreateHouseholdAndOwner} className="grid gap-3 md:grid-cols-4">
          <div>
            <div className="text-sm mb-1">House name</div>
            <Input name="householdName" placeholder="Smith household" />
          </div>
          <div>
            <div className="text-sm mb-1">Owner name</div>
            <Input name="ownerName" placeholder="Alex Smith" />
          </div>
          <div>
            <div className="text-sm mb-1">Owner email</div>
            <Input name="ownerEmail" placeholder="alex@example.com" />
          </div>
          <div>
            <div className="text-sm mb-1">Owner password</div>
            <Input type="password" name="ownerPassword" placeholder="••••••••" />
          </div>
          <div className="md:col-span-4">
            <Button type="submit">Create</Button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border p-4 space-y-3">
        <div className="font-medium">Create user in existing house</div>
        <form action={adminCreateUserInHousehold} className="grid gap-3 md:grid-cols-4">
          <div>
            <div className="text-sm mb-1">House</div>
            <select
              name="householdId"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={households[0]?.id ?? ""}
            >
              {households.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.id} - {h.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-sm mb-1">Name</div>
            <Input name="name" placeholder="Jamie Smith" />
          </div>
          <div>
            <div className="text-sm mb-1">Email</div>
            <Input name="email" placeholder="jamie@example.com" />
          </div>
          <div>
            <div className="text-sm mb-1">Password</div>
            <Input type="password" name="password" placeholder="••••••••" />
          </div>
          <div className="md:col-span-4">
            <Button type="submit" disabled={households.length === 0}>
              Create
            </Button>
            {households.length === 0 && (
              <span className="ml-3 text-sm text-muted-foreground">
                Create a house first.
              </span>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-lg border">
        <div className="p-4 border-b font-medium">Existing users</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="text-left p-3">Id</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">House</th>
                <th className="text-left p-3">Super admin</th>
                <th className="text-left p-3">AI</th>
                <th className="text-left p-3">Recon</th>
                <th className="text-left p-3">Save</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-b-0">
                  <td className="p-3">{u.id}</td>
                  <td className="p-3">{u.name}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.householdId}</td>
                  <td className="p-3">
                    <form action={adminSetUserSuperAdmin} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="checkbox" name="isSuperAdmin" defaultChecked={u.isSuperAdmin} />
                      <Button type="submit" size="sm" variant="secondary">
                        Save
                      </Button>
                    </form>
                  </td>
                  <td className="p-3">{u.aiFeatureAllowed ? "Yes" : "No"}</td>
                  <td className="p-3">{u.reconFeatureAllowed ? "Yes" : "No"}</td>
                  <td className="p-3">
                    <form action={adminSetUserFeatureAccess} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={u.id} />
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name="aiFeatureAllowed" defaultChecked={u.aiFeatureAllowed} />
                        <span>AI</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name="reconFeatureAllowed" defaultChecked={u.reconFeatureAllowed} />
                        <span>Recon</span>
                      </label>
                      <Button type="submit" size="sm" variant="secondary">
                        Save
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td className="p-4 text-muted-foreground" colSpan={8}>
                    No users found.
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

