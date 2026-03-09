import { auth } from "@/lib/auth";
import { getSplitGroupRepository } from "@/lib/repositories";
import { SplitService } from "@/lib/services/split.service";
import { SplitsPageClient } from "@/components/splits/splits-page-client";

interface SplitsPageProps {
  searchParams: Promise<{ group?: string }>;
}

export default async function SplitsPage({ searchParams }: SplitsPageProps) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = Number(session.user.id);
  const { group: groupParam } = await searchParams;

  const splitGroupRepo = getSplitGroupRepository();
  const splitService = new SplitService();
  const groups = await splitGroupRepo.findAll();
  const balancePerGroup = await Promise.all(
    groups.map(async (g) => ({
      groupId: g.id,
      groupName: g.name,
      balance: await splitService.getBalance(userId, g.id),
    }))
  );
  const selectedGroupIdParam = groupParam ? parseInt(groupParam, 10) : null;
  const defaultGroup = groups.find((g) => g.isDefault) ?? groups[0];
  const selectedGroupId =
    selectedGroupIdParam && groups.some((g) => g.id === selectedGroupIdParam)
      ? selectedGroupIdParam
      : defaultGroup?.id ?? null;
  const balance = selectedGroupId
    ? balancePerGroup.find((b) => b.groupId === selectedGroupId)?.balance ?? {
        owedToMe: 0,
        iOwe: 0,
        net: 0,
        perUser: [],
      }
    : { owedToMe: 0, iOwe: 0, net: 0, perUser: [] };
  const history = selectedGroupId
    ? await splitService.getSplitHistory(userId, selectedGroupId)
    : [];

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-lg font-semibold">Splits</h1>
      <SplitsPageClient
        groups={groups}
        balancePerGroup={balancePerGroup}
        selectedGroupId={selectedGroupId}
        balance={balance}
        history={history}
        currentUserId={userId}
      />
    </div>
  );
}
