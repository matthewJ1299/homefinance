import { auth } from "@/lib/auth";
import { setRequestContext } from "@/lib/db/request-context";
import { redirect } from "next/navigation";
import {
  getCategoryRepository,
  getUserRepository,
  getSplitGroupRepository,
  getSharedListRepository,
} from "@/lib/repositories";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const userId = Number(session.user.id);
  setRequestContext({
    userId: session.user.id,
    userName: session.user.name ?? undefined,
  });

  const [categories, otherUsers, splitGroups, lists] = await Promise.all([
    getCategoryRepository().findAll(),
    getUserRepository().findAllExcept(userId),
    getSplitGroupRepository().findAll(),
    getSharedListRepository().findAll(),
  ]);
  const otherUserName = otherUsers[0]?.name;

  return (
    <AppShell
      fabData={{
        categories,
        userId,
        otherUserName,
        splitGroups,
        lists,
      }}
    >
      {children}
    </AppShell>
  );
}
