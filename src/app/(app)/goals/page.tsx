import { auth } from "@/lib/auth";
import { GoalsManage } from "@/components/goals/goals-manage";

export default async function GoalsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-semibold">Goals</h1>
      <p className="text-sm text-muted-foreground">
        Goals track intent. Contributions link real account movements to a goal without counting them as expenses.
      </p>
      <GoalsManage />
    </div>
  );
}

