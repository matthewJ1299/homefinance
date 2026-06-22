export type { Note } from "./note";
export { NOTE_LINKED_TYPE_SHARED_LIST_ITEM } from "./note-linked-types";

export type IncomeType = "salary" | "ad_hoc";

export interface RecurringIncome {
  id: number;
  userId: number;
  amount: number;
  type: IncomeType;
  description: string | null;
  dayOfMonth: number;
}

export interface RecurringExpense {
  id: number;
  userId: number;
  categoryId: number;
  amount: number;
  note: string | null;
  dayOfMonth: number;
}

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

export interface SplitGroup {
  id: number;
  name: string;
  isDefault: boolean;
  sortOrder: number;
}

export interface ExpenseWithDetails {
  id: number;
  userId: number;
  userName: string;
  categoryId: number;
  categoryName: string;
  amount: number;
  note: string | null;
  date: string;
  /** Budget month key (yyyy-MM) stored on the expense row. */
  month: string;
  createdAt: string;
  splitGroupId?: string | null;
  paidByUserId?: number | null;
  splitExpenseGroupId?: number | null;
  accountId?: number | null;
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
  expenseId: number | null;
  incomeId: number | null;
  payerUserId: number;
  payerUserName: string;
  recipientUserId: number;
  recipientUserName: string;
  amount: number;
  date: string;
}

export type SplitHistoryItem = SplitExpenseHistoryItem | SplitSettlementHistoryItem;

export type AccountType = "bank" | "savings" | "credit";

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  ownerUserId: number;
  creditLimit: number | null;
  createdAt: string;
}

export interface AccountWithBalance extends Account {
  balance: number;
  availableCredit?: number;
}

export type GoalType = "savings" | "credit";
export type GoalStrategy = "avalanche" | "snowball" | "target_date";
export type GoalContributionKind = "contribution" | "withdrawal" | "payment" | "interest";

export interface Goal {
  id: number;
  ownerUserId: number;
  name: string;
  type: GoalType;
  targetAmount: number | null;
  monthlyTarget: number;
  linkedAccountId: number | null;
  apr: number | null;
  strategy: GoalStrategy | null;
  archivedAt: string | null;
  createdAt: string;
}

export interface GoalContribution {
  id: number;
  goalId: number;
  ownerUserId: number;
  accountTransactionId: number;
  kind: GoalContributionKind;
  /** Minor units, always positive; direction inferred by kind. */
  amount: number;
  effectiveDate: string;
  note: string | null;
  createdAt: string;
}
