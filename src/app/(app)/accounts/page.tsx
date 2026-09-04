import { auth } from "@/lib/auth";
import { getUserRepository } from "@/lib/repositories";
import { AccountsManage } from "@/components/accounts/accounts-manage";
import type { HouseholdMember } from "@/lib/types/household-member";

export default async function AccountsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = Number(session.user.id);

  const others = await getUserRepository().findAllExcept(userId);
  const otherMembers: HouseholdMember[] = others.map((u) => ({ id: u.id, name: u.name }));

  return (
    <div className="p-4 space-y-6 pb-24 md:pb-6">
      <h1 className="text-xl font-semibold">Accounts</h1>
      <p className="text-sm text-muted-foreground">
        View and manage your accounts. Use Transfer Money to move funds between accounts (e.g. bank
        to savings, or pay down credit).
      </p>
      <AccountsManage otherMembers={otherMembers} />
    </div>
  );
}
