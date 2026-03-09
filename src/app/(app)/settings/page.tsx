import { auth } from "@/lib/auth";
import {
  getCategoryRepository,
  getSplitGroupRepository,
  getRecurringIncomeRepository,
  getRecurringExpenseRepository,
  getSharedListRepository,
} from "@/lib/repositories";
import { getCurrentMonth, formatMonth } from "@/lib/utils/date";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { PopulateMonthButton } from "@/components/dashboard/populate-month-button";
import { CategoriesManage } from "@/components/categories/categories-manage";
import { SplitGroupsManage } from "@/components/split-groups/split-groups-manage";
import { RecurringIncomeManage } from "@/components/recurring-income/recurring-income-manage";
import { RecurringExpenseManage } from "@/components/recurring-expenses/recurring-expense-manage";
import { SharedListsManage } from "@/components/shared-lists/shared-lists-manage";
import { PushNotificationsSettings } from "@/components/push/push-notifications-settings";

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

  const currentMonth = getCurrentMonth();

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <p className="text-sm text-muted-foreground">
        Manage categories, split groups, and recurring income or expenses in one place.
      </p>

      <PushNotificationsSettings />

      <section className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-medium mb-1">Recurring this month</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Create income and expense entries from your recurring templates for {formatMonth(currentMonth)}. Only items that do not exist yet for this month are added.
        </p>
        <PopulateMonthButton month={currentMonth} />
      </section>

      <div className="space-y-3">
        <CollapsibleSection title="Categories" defaultOpen={true}>
          <CategoriesManage categories={categories} />
        </CollapsibleSection>

        <CollapsibleSection title="Split groups" defaultOpen={false}>
          <p className="text-sm text-muted-foreground mb-3">
            Groups let you separate split expenses (e.g. Home, Wedding). The default group is used when none is selected.
          </p>
          <SplitGroupsManage groups={splitGroups} />
        </CollapsibleSection>

        <CollapsibleSection title="Recurring income" defaultOpen={false}>
          <p className="text-sm text-muted-foreground mb-3">
            Add templates for income that repeats every month. Use &quot;Populate month&quot; on the dashboard to create actual income entries from these.
          </p>
          <RecurringIncomeManage items={recurringIncome} />
        </CollapsibleSection>

        <CollapsibleSection title="Recurring expenses" defaultOpen={false}>
          <p className="text-sm text-muted-foreground mb-3">
            Add templates for expenses that repeat every month. Use &quot;Populate month&quot; on the dashboard to create actual expense entries from these.
          </p>
          <RecurringExpenseManage items={recurringExpenses} categories={categoriesForRecurring} />
        </CollapsibleSection>

        <CollapsibleSection title="Shared lists" defaultOpen={false}>
          <p className="text-sm text-muted-foreground mb-3">
            Create and delete shared lists. The first list is shown when you open Lists from the nav. Switch lists from the list detail page.
          </p>
          <SharedListsManage lists={sharedLists} />
        </CollapsibleSection>
      </div>
    </div>
  );
}
