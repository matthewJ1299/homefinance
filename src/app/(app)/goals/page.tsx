import Link from "next/link";
import { auth } from "@/lib/auth";
import { hasFeature, isTrackerMode } from "@/lib/features/access";
import { FeatureUnavailable } from "@/components/ui/feature-unavailable";
import { BudgetingOffNotice } from "@/components/ui/budgeting-off-notice";
import { BudgetService } from "@/lib/services/budget.service";
import { getCategoryRepository } from "@/lib/repositories";
import { getDefaultBudgetMonthForUser } from "@/lib/utils/budget-month-for-user";
import { buildGoalRows } from "@/lib/services/finance/goal-categories";
import { GoalCategoryList } from "@/components/goals/goal-category-list";

/**
 * A filtered view of the budget, not a separate feature.
 *
 * A goal is a category with a target and a date, so the envelope model does the
 * arithmetic and money in a goal is money assigned like any other.
 */
export default async function GoalsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (isTrackerMode()) return <BudgetingOffNotice title="Goals" />;
  if (!hasFeature("goals")) {
    return <FeatureUnavailable feature="goals" />;
  }
  const userId = Number(session.user.id);
  const month = await getDefaultBudgetMonthForUser(userId);

  const [overview, categories] = await Promise.all([
    new BudgetService().getOverview(month, userId),
    getCategoryRepository().findAll(),
  ]);
  const targetById = new Map(categories.map((c) => [c.id, c]));

  const rows = buildGoalRows(
    overview.categories.map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      available: c.available,
      assigned: c.assigned,
      targetMinor: targetById.get(c.categoryId)?.targetMinor ?? null,
      targetDate: targetById.get(c.categoryId)?.targetDate ?? null,
    })),
    month
  );

  return (
    <div className="p-4 space-y-6 pb-24 md:pb-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Goals</h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Categories with something to reach by a date. Assigning to one is the same as assigning
          to any category —{" "}
          <Link href="/budget" className="font-semibold text-primary">
            it all happens on Budget
          </Link>
          .
        </p>
      </div>
      <GoalCategoryList rows={rows} categories={overview.categories} month={month} />
    </div>
  );
}
