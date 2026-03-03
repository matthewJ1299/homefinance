export type IncomeType = "salary" | "ad_hoc";

export type CostType = "fixed" | "variable";

export interface Category {
  id: number;
  name: string;
  groupName: string;
  icon: string | null;
  sortOrder: number;
  isActive?: boolean;
  costType: CostType;
  defaultAmount: number | null;
}

export type CategoryWithActive = Category & { isActive: boolean };

export interface ExpenseWithDetails {
  id: number;
  userId: number;
  userName: string;
  categoryId: number;
  categoryName: string;
  amount: number;
  note: string | null;
  date: string;
  createdAt: string;
}
