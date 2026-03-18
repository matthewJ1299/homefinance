import { auth } from "@/lib/auth";
import { AccountsManage } from "@/components/accounts/accounts-manage";

export default async function AccountsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-semibold">Accounts</h1>
      <p className="text-sm text-muted-foreground">
        View and manage your accounts. Use Transfer Money to move funds between accounts (e.g. bank to savings, or pay down credit).
      </p>
      <AccountsManage />
    </div>
  );
}

