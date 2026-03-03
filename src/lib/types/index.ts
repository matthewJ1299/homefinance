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
  splitGroupId?: string | null;
  paidByUserId?: number | null;
}

export type SplitType = "equal" | "full" | "exact";

export interface SplitBalance {
  owedToMe: number;
  iOwe: number;
  net: number;
  perUser: Array<{ userId: number; userName: string; owedToMe: number; iOwe: number }>;
}

export interface SplitExpenseHistoryItem {
  type: "expense";
  expenseId: number;
  paidByUserId: number;
  paidByUserName: string;
  totalAmount: number;
  categoryId: number;
  categoryName: string;
  date: string;
  note: string | null;
  allocations: Array<{ userId: number; userName: string; amount: number }>;
}

export interface SplitSettlementHistoryItem {
  type: "settlement";
  settlementId: number;
  payerUserId: number;
  payerUserName: string;
  recipientUserId: number;
  recipientUserName: string;
  amount: number;
  date: string;
}

export type SplitHistoryItem = SplitExpenseHistoryItem | SplitSettlementHistoryItem;
