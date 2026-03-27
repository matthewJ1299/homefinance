import { auth } from "@/lib/auth";
import { GoalService } from "@/lib/services/goal.service";
import { GoalsExpandedClient } from "@/components/goals/goals-expanded-client";

export default async function GoalsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = Number(session.user.id);
  const goalService = new GoalService();
  const goals = await goalService.listGoals(userId);

  return (
    <div className="p-4 space-y-6 pb-24 md:pb-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Goals</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-prose">
          What is happening, why, and what to do next. Actual balances and activity come from your account ledger;
          projections are computed live and are not stored.
        </p>
      </div>
      <GoalsExpandedClient initialGoals={goals} />
    </div>
  );
}
