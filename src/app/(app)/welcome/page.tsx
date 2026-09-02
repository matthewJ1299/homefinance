import Link from "next/link";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { getCategoryRepository, getUserRepository } from "@/lib/repositories";
import { BudgetService } from "@/lib/services/budget.service";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import {
  getDefaultBudgetMonthForUser,
  getBudgetPeriodForUserMonth,
} from "@/lib/utils/budget-month-for-user";
import { pickQuickAddDateForBudgetPeriod } from "@/lib/utils/date";

export default async function WelcomePage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userId = Number(session.user.id);
  const userRepo = getUserRepository();
  const budgetMonth = await getDefaultBudgetMonthForUser(userId);

  const [setup, categories, budgetMonthStartDay, budgetOverview] = await Promise.all([
    userRepo.getSetupWizardState(userId),
    getCategoryRepository().findAllIncludingInactive(),
    userRepo.getBudgetMonthStartDay(userId),
    new BudgetService().getOverview(budgetMonth, userId),
  ]);

  const today = format(new Date(), "yyyy-MM-dd");
  const budgetPeriod = await getBudgetPeriodForUserMonth(budgetMonth, userId);
  const defaultIncomeDate = pickQuickAddDateForBudgetPeriod(today, budgetPeriod);

  return (
    <div className="mx-auto max-w-2xl p-4 pb-16">
      <OnboardingFlow
        setupStatus={setup.status}
        storedStep={setup.step}
        budgetMonthStartDay={budgetMonthStartDay}
        defaultIncomeDate={defaultIncomeDate}
        categories={categories}
        budgetMonth={budgetMonth}
        budgetOverview={budgetOverview}
      />
      {setup.status === "completed" ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Setup is complete.{" "}
          <Link href="/dashboard" className="text-primary hover:underline">
            Back to Home
          </Link>
        </p>
      ) : null}
    </div>
  );
}
