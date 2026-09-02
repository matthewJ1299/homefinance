import { auth } from "@/lib/auth";
import {
  getCategoryRepository,
  getSplitGroupRepository,
  getRecurringIncomeRepository,
  getRecurringExpenseRepository,
  getSharedListRepository,
  getUserRepository,
} from "@/lib/repositories";
import { formatBudgetMonthLabel } from "@/lib/utils/date";
import { getDefaultBudgetMonthForUser } from "@/lib/utils/budget-month-for-user";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { PopulateMonthButton } from "@/components/dashboard/populate-month-button";
import { CategoriesManage } from "@/components/categories/categories-manage";
import { SplitGroupsManage } from "@/components/split-groups/split-groups-manage";
import { RecurringIncomeManage } from "@/components/recurring-income/recurring-income-manage";
import { RecurringExpenseManage } from "@/components/recurring-expenses/recurring-expense-manage";
import { SharedListsManage } from "@/components/shared-lists/shared-lists-manage";
import { PushNotificationsSettings } from "@/components/push/push-notifications-settings";
import { DashboardTilesSettings } from "@/components/settings/dashboard-tiles-settings";
import { AccountsManage } from "@/components/accounts/accounts-manage";
import { BudgetMonthRangeSettings } from "@/components/settings/budget-month-range-settings";
import { ExportTransactionsSettings } from "@/components/settings/export-transactions-settings";
import { OnboardingLauncherCard } from "@/components/onboarding/onboarding-launcher-card";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsListsSection } from "@/components/settings/settings-lists-section";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = Number(session.user.id);

  const [categories, splitGroups, recurringIncome, recurringExpenses, sharedLists] = await Promise.all([
    getCategoryRepository().findAllIncludingInactive(),
    getSplitGroupRepository().findAll(),
    getRecurringIncomeRepository().findByUserId(userId),
    getRecurringExpenseRepository().findByUserId(userId),
    getSharedListRepository().findAll(),
  ]);
  const categoriesForRecurring = await getCategoryRepository().findAll();

  const userRepoForSettings = getUserRepository();
  const budgetMonthStartDay = await userRepoForSettings.getBudgetMonthStartDay(userId);
  const currentMonth = await getDefaultBudgetMonthForUser(userId);

  return (
    <div className="p-4 space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Profile, preferences, household data, and exports — grouped so you can find things quickly.
        </p>
      </div>

      <SettingsSection title="Profile" description="Your sign-in identity and password.">
        <ProfileSettings name={session.user.name ?? "User"} email={session.user.email ?? ""} />
        <OnboardingLauncherCard />
      </SettingsSection>

      <SettingsSection title="Preferences" description="Notifications, budget timing, and dashboard layout.">
        <PushNotificationsSettings />
        <BudgetMonthRangeSettings currentStartDay={budgetMonthStartDay} />
        <DashboardTilesSettings />
      </SettingsSection>

      <SettingsSection
        title="Household data"
        description="Categories, accounts, splits, recurring templates, and lists."
      >
        <CollapsibleSection title="Categories" defaultOpen={false}>
          <CategoriesManage categories={categories} />
        </CollapsibleSection>

        <CollapsibleSection title="Accounts" defaultOpen={false}>
          <p className="text-sm text-muted-foreground mb-3">
            Track bank balances, savings, and credit. Link income and expenses to accounts. Use Transfer
            Money to move funds between accounts (e.g. bank to savings, or pay down credit).
          </p>
          <AccountsManage />
        </CollapsibleSection>

        <CollapsibleSection title="Split groups" defaultOpen={false}>
          <p className="text-sm text-muted-foreground mb-3">
            Groups let you separate split expenses (e.g. Home, Wedding). The default group is used when
            none is selected.
          </p>
          <SplitGroupsManage groups={splitGroups} />
        </CollapsibleSection>

        <CollapsibleSection title="Recurring income" defaultOpen={false}>
          <p className="text-sm text-muted-foreground mb-3">
            Add templates for income that repeats every month. Use &quot;Populate month&quot; below or on
            the dashboard to create actual income entries from these.
          </p>
          <RecurringIncomeManage items={recurringIncome} />
        </CollapsibleSection>

        <CollapsibleSection title="Recurring expenses" defaultOpen={false}>
          <p className="text-sm text-muted-foreground mb-3">
            Add templates for expenses that repeat every month. Use &quot;Populate month&quot; below or on
            the dashboard to create actual expense entries from these.
          </p>
          <RecurringExpenseManage items={recurringExpenses} categories={categoriesForRecurring} />
        </CollapsibleSection>

        <SettingsListsSection lists={sharedLists} />
      </SettingsSection>

      <SettingsSection title="Data and export" description="Populate recurring rows and download transactions.">
        <ExportTransactionsSettings />
        <section className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-medium mb-1">Recurring this month</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Create income and expense entries from your recurring templates for{" "}
            {formatBudgetMonthLabel(currentMonth, budgetMonthStartDay)}. Only items that do not exist yet
            for this month are added.
          </p>
          <PopulateMonthButton month={currentMonth} />
        </section>
      </SettingsSection>
    </div>
  );
}
