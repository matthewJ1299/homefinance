import { auth } from "@/lib/auth";
import { initDb } from "@/lib/db";
import { SplitService } from "@/lib/services/split.service";
import { SplitsPageClient } from "@/components/splits/splits-page-client";

export default async function SplitsPage() {
  await initDb();
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = Number(session.user.id);

  const splitService = new SplitService();
  const [balance, history] = await Promise.all([
    splitService.getBalance(userId),
    splitService.getSplitHistory(userId),
  ]);

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-lg font-semibold">Splits</h1>
      <SplitsPageClient
        balance={balance}
        history={history}
        currentUserId={userId}
      />
    </div>
  );
}
