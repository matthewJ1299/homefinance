import { auth } from "@/lib/auth";
import {
  getCategoryRepository,
  getSplitGroupRepository,
  getRecurringIncomeRepository,
  getRecurringExpenseRepository,
  getSharedListRepository,
  getHouseholdRepository,
  getUserRepository,
} from "@/lib/repositories";
import { formatBudgetMonthLabel } from "@/lib/utils/date";
import {
  budgetMonthStartDayForUser,
  getDefaultBudgetMonthForUser,
} from "@/lib/utils/budget-month-for-user";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { CategoriesManage } from "@/components/categories/categories-manage";
import { SplitGroupsManage } from "@/components/split-groups/split-groups-manage";
import { RecurringIncomeManage } from "@/components/recurring-income/recurring-income-manage";
import { RecurringExpenseManage } from "@/components/recurring-expenses/recurring-expense-manage";
import { SharedListsManage } from "@/components/shared-lists/shared-lists-manage";
import { PushNotificationsSettings } from "@/components/push/push-notifications-settings";
import { DashboardTilesSettings } from "@/components/settings/dashboard-tiles-settings";
import { HomeModeSettings } from "@/components/settings/home-mode-settings";
import { AccountsManage } from "@/components/accounts/accounts-manage";
import { BudgetMonthRangeSettings } from "@/components/settings/budget-month-range-settings";
import { HouseholdMembersPanel } from "@/components/household/household-members-panel";
import { ExportTransactionsSettings } from "@/components/settings/export-transactions-settings";
import { BudgetMaintenanceSettings } from "@/components/settings/budget-maintenance-settings";
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
  const [household, allMembers] = await Promise.all([
    getHouseholdRepository().getCurrent(),
    getUserRepository().findAll(),
  ]);
  const householdMembers = allMembers.map((m) => ({ id: m.id, name: m.name }));

  // The day the *household* runs on -- which is what the settings action
  // writes. Showing the reader's own stale column here let one member edit a
  // number the app was not using.
  const budgetMonthStartDay = await budgetMonthStartDayForUser(userId);
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

      <SettingsSection title="Preferences" description="Budgeting, notifications, and dashboard layout.">
        <HomeModeSettings currentMode={session.user.homeMode ?? "budget"} />
        <PushNotificationsSettings />
        <DashboardTilesSettings />
      </SettingsSection>

      {/* The household was something you could only see while being onboarded,
          and never again. The month start day lives here rather than under
          Preferences because it is not a preference -- it is shared. */}
      <SettingsSection
        title="Household"
        description="Your house, who is in it, and the settings everyone shares."
      >
        <HouseholdMembersPanel
          householdName={household?.name ?? "Your house"}
          members={householdMembers}
          meUserId={userId}
        />
        <BudgetMonthRangeSettings
          currentStartDay={budgetMonthStartDay}
          description="This is when the month starts for everyone in the house."
        />
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
          <AccountsManage currentUserId={userId} />
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
            Add templates for income that repeats every month. They are created automatically when a new
            month opens.
          </p>
          <RecurringIncomeManage items={recurringIncome} />
        </CollapsibleSection>

        <CollapsibleSection title="Recurring expenses" defaultOpen={false}>
          <p className="text-sm text-muted-foreground mb-3">
            Add templates for expenses that repeat every month. They are created automatically when a new
            month opens.
          </p>
          <RecurringExpenseManage items={recurringExpenses} categories={categoriesForRecurring} />
        </CollapsibleSection>

        <SettingsListsSection lists={sharedLists} />
      </SettingsSection>

      <SettingsSection title="Data and export" description="Download your transactions.">
        <ExportTransactionsSettings />
      </SettingsSection>

      <SettingsSection
        title="Budget maintenance"
        description="Repair or reset your own envelope budget. Your expenses, income and balances are never affected."
      >
        <BudgetMaintenanceSettings />
      </SettingsSection>
    </div>
  );
}
