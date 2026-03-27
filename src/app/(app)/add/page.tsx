import { auth } from "@/lib/auth";
import {
  getCategoryRepository,
  getUserRepository,
  getSplitGroupRepository,
  getSharedListRepository,
} from "@/lib/repositories";
import { AddHubClient } from "@/components/quick-add-fab/add-hub-client";

export default async function AddPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = Number(session.user.id);

  const [categories, otherUsers, splitGroups, lists] = await Promise.all([
    getCategoryRepository().findAll(),
    getUserRepository().findAllExcept(userId),
    getSplitGroupRepository().findAll(),
    getSharedListRepository().findAll(),
  ]);
  const otherUserName = otherUsers[0]?.name;

  return (
    <div className="p-4">
      <AddHubClient
        categories={categories}
        userId={userId}
        otherUserName={otherUserName}
        splitGroups={splitGroups}
        lists={lists}
      />
    </div>
  );
}
