import Link from "next/link";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import {
  getCategoryRepository,
  getHouseholdRepository,
  getUserRepository,
} from "@/lib/repositories";
import { JoinedHouseholdIntro } from "@/components/onboarding/joined-household-intro";
import type { HouseholdMember } from "@/lib/types/household-member";
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

  const [setup, categories, budgetOverview, household, allMembers] = await Promise.all([
    userRepo.getSetupWizardState(userId),
    getCategoryRepository().findAllIncludingInactive(),
    new BudgetService().getOverview(budgetMonth, userId),
    getHouseholdRepository().getCurrent(),
    userRepo.findAll(),
  ]);
  const budgetMonthStartDay = household?.budgetMonthStartDay ?? 1;
  const members: HouseholdMember[] = allMembers.map((u) => ({ id: u.id, name: u.name }));

  // Someone joining an existing house arrives to a budget month, shared
  // accounts and possibly a mortgage that are already decided. Their first run
  // is not the person's who set it up.
  const isJoiner = members.length > 1 && members[0]?.id !== userId;

  const today = format(new Date(), "yyyy-MM-dd");
  const budgetPeriod = await getBudgetPeriodForUserMonth(budgetMonth, userId);
  const defaultIncomeDate = pickQuickAddDateForBudgetPeriod(today, budgetPeriod);

  return (
    <div className="mx-auto max-w-2xl p-4 pb-16">
      {isJoiner && setup.status !== "completed" ? (
        <JoinedHouseholdIntro
          householdName={household?.name ?? "the house"}
          setUpByName={members[0]?.name ?? "Someone"}
          budgetMonthStartDay={budgetMonthStartDay}
          sharedAccountCount={0}
        />
      ) : null}
      <OnboardingFlow
        setupStatus={setup.status}
        storedStep={setup.step}
        budgetMonthStartDay={budgetMonthStartDay}
        defaultIncomeDate={defaultIncomeDate}
        categories={categories}
        budgetMonth={budgetMonth}
        budgetOverview={budgetOverview}
        householdName={household?.name ?? ""}
        members={members}
        meUserId={userId}
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
