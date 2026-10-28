import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isTrackerMode } from "@/lib/features/access";
import { BudgetService } from "@/lib/services/budget.service";
import { budgetMonthStartDayForUser } from "@/lib/utils/budget-month-for-user";
import { formatBudgetMonthLabel } from "@/lib/utils/date";
import { MonthOpenCard } from "@/components/budget/month-open-card";

/**
 * Fires once after the budget-month start day passes. Replaces "Populate this
 * month" in Settings, which asked you to do the thing rather than telling you
 * it had happened.
 */
export default async function NewMonthPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  // A tracker user never opens months; the flow has no destination for them.
  if (isTrackerMode()) redirect("/dashboard");
  const userId = Number(session.user.id);

  const service = new BudgetService();
  const pending = await service.needsMonthOpen(userId);
  if (!pending) redirect("/dashboard");

  const [prior, next, startDay] = await Promise.all([
    service.getOverview(pending.previous, userId),
    // What the new month actually opens with: templates, fixed categories and
    // anything already assigned. `prior.totalAssigned` was last month's.
    service.getOverview(pending.month, userId),
    budgetMonthStartDayForUser(userId),
  ]);

  const overspent = prior.categories
    .filter((c) => c.available < 0)
    .map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      available: c.available,
    }))
    .sort((a, b) => a.available - b.available);

  const carrying = prior.categories
    .filter((c) => c.available > 0 && c.rollover)
    .map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      available: c.available,
    }))
    .sort((a, b) => b.available - a.available);

  const carriedOverspend = prior.categories
    .filter((c) => c.available < 0)
    .reduce((sum, c) => sum - c.available, 0);

  return (
    <div className="p-4 pb-24 md:pb-8">
      <div className="mx-auto max-w-lg">
        <MonthOpenCard
          month={pending.month}
          previous={pending.previous}
          previousLabel={formatBudgetMonthLabel(pending.previous, startDay)}
          monthLabel={formatBudgetMonthLabel(pending.month, startDay)}
          overspent={overspent}
          carrying={carrying}
          startsWith={next.totalAssigned}
          carriedOverspend={carriedOverspend}
          skippedMonths={pending.skippedMonths}
        />
      </div>
    </div>
  );
}
