import { run } from "@/lib/db";
import { defaultCategories } from "./seed-data";

const BOOTSTRAP_CATEGORIES = defaultCategories.map((c) => ({
  ...c,
  defaultAmount: null as number | null,
}));

/**
 * Inserts default split group and budget categories for a new household.
 * Category default amounts are null so onboarding sets real amounts.
 */
export async function bootstrapHouseholdDefaults(householdId: number): Promise<void> {
  await run(
    "INSERT INTO split_groups (name, is_default, sort_order, household_id) VALUES ('Default', true, 0, ?)",
    [householdId]
  );

  for (const c of BOOTSTRAP_CATEGORIES) {
    await run(
      "INSERT INTO categories (name, group_name, icon, sort_order, is_active, cost_type, default_amount, household_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [c.name, c.groupName, null, c.sortOrder, true, c.costType, c.defaultAmount, householdId]
    );
  }

  const defaultCalendarCategories: Array<{ name: string; color: string; sortOrder: number }> = [
    { name: "Work", color: "#3B82F6", sortOrder: 1 },
    { name: "Personal", color: "#22C55E", sortOrder: 2 },
    { name: "Family", color: "#A855F7", sortOrder: 3 },
    { name: "Health", color: "#EF4444", sortOrder: 4 },
    { name: "Other", color: "#F97316", sortOrder: 5 },
  ];
  for (const cc of defaultCalendarCategories) {
    await run(
      "INSERT INTO calendar_categories (name, color, sort_order, household_id) VALUES (?, ?, ?, ?)",
      [cc.name, cc.color, cc.sortOrder, householdId]
    );
  }
}
