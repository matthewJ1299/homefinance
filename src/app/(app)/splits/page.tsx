import { auth } from "@/lib/auth";
import { getSplitGroupRepository } from "@/lib/repositories";
import { SplitService } from "@/lib/services/split.service";
import { BudgetService } from "@/lib/services/budget.service";
import { getDefaultBudgetMonthForUser } from "@/lib/utils/budget-month-for-user";
import { SplitsPageClient } from "@/components/splits/splits-page-client";

interface SplitsPageProps {
  searchParams: Promise<{ group?: string }>;
}

export default async function SplitsPage({ searchParams }: SplitsPageProps) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = Number(session.user.id);
  const { group: groupParam } = await searchParams;

  const splitService = new SplitService();
  const groups = await getSplitGroupRepository().findAll();

  const selectedGroupIdParam = groupParam ? parseInt(groupParam, 10) : null;
  const defaultGroup = groups.find((g) => g.isDefault) ?? groups[0];
  const selectedGroupId =
    selectedGroupIdParam && groups.some((g) => g.id === selectedGroupIdParam)
      ? selectedGroupIdParam
      : (defaultGroup?.id ?? null);

  const month = await getDefaultBudgetMonthForUser(userId);
  const [balance, balances, history, overview] = await Promise.all([
    splitService.getBalance(userId, selectedGroupId ?? undefined),
    splitService.getBalances(userId, selectedGroupId ?? undefined),
    selectedGroupId ? splitService.getSplitHistory(userId, selectedGroupId) : Promise.resolve([]),
    new BudgetService().getOverview(month, userId),
  ]);

  return (
    <div className="p-4 space-y-6 pb-24 md:pb-6">
      {/* "Splits" is app jargon. */}
      <h1 className="text-lg font-semibold">Shared costs</h1>
      <SplitsPageClient
        groups={groups}
        selectedGroupId={selectedGroupId}
        balance={balance}
        balances={balances}
        history={history}
        currentUserId={userId}
        settleCategories={overview.categories.map((c) => ({
          categoryId: c.categoryId,
          categoryName: c.categoryName,
          available: c.available,
        }))}
      />
    </div>
  );
}
