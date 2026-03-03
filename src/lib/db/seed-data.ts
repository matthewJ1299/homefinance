/**
 * Shared seed data for db:seed and db:reset (categories-only).
 * Single source of truth for default categories.
 */

/** costType: fixed = same amount each month (auto-populated); variable = varies by month. defaultAmount in cents (for fixed only). */
export const defaultCategories: Array<{
  name: string;
  groupName: string;
  sortOrder: number;
  costType: "fixed" | "variable";
  defaultAmount: number | null;
}> = [
  { name: "Groceries", groupName: "Living", sortOrder: 0, costType: "variable", defaultAmount: null },
  { name: "Transport", groupName: "Living", sortOrder: 1, costType: "variable", defaultAmount: null },
  { name: "Dining Out", groupName: "Living", sortOrder: 2, costType: "variable", defaultAmount: null },
  { name: "Utilities", groupName: "Bills", sortOrder: 3, costType: "fixed", defaultAmount: 12000 },
  { name: "Entertainment", groupName: "Lifestyle", sortOrder: 4, costType: "variable", defaultAmount: null },
  { name: "Healthcare", groupName: "Bills", sortOrder: 5, costType: "variable", defaultAmount: null },
  { name: "Insurance", groupName: "Bills", sortOrder: 6, costType: "fixed", defaultAmount: 5800 },
  { name: "Savings", groupName: "Goals", sortOrder: 7, costType: "fixed", defaultAmount: 15000 },
  { name: "Clothing", groupName: "Lifestyle", sortOrder: 8, costType: "variable", defaultAmount: null },
  { name: "Education", groupName: "Goals", sortOrder: 9, costType: "variable", defaultAmount: null },
  { name: "Home", groupName: "Living", sortOrder: 10, costType: "variable", defaultAmount: null },
  { name: "Other", groupName: "Other", sortOrder: 11, costType: "variable", defaultAmount: null },
  { name: "Splits", groupName: "Other", sortOrder: 12, costType: "variable", defaultAmount: null },
  { name: "Mortgage", groupName: "Bills", sortOrder: 13, costType: "variable", defaultAmount: null },
];
