import type { AccountType, SplitBalance } from "@/lib/types";

export interface SignedTransaction {
  amount: number;
}

export function applyTransaction(input: {
  balance: number;
  transaction: SignedTransaction;
}): { balance: number } {
  return { balance: input.balance + input.transaction.amount };
}

export function calculateNetWorth(accounts: Array<{ type: AccountType; balance: number }>): number {
  // Credit account balances are already signed (debt is negative), so net worth is a simple sum.
  return accounts.reduce((sum, a) => sum + a.balance, 0);
}

export interface BudgetCategoryRow {
  categoryId: number;
  categoryName: string;
  groupName: string;
  costType: "fixed" | "variable";
  allocated: number;
  spent: number;
  remaining: number;
  isOverspent: boolean;
  spentByUser: Record<number, number>;
}

export function calculateBudgetOverviewArithmetic(input: {
  totalIncome: number;
  totalExpenses: number;
  categories: Array<{ id: number; name: string; groupName: string; costType?: "fixed" | "variable" }>;
  allocationMap: Map<number, number>;
  expenses: Array<{ userId: number; categoryId: number; amount: number }>;
  spentByCategory: Record<number, number>;
}): {
  balance: number;
  totalAllocated: number;
  categoryRows: BudgetCategoryRow[];
  unallocated: number;
  isBalanced: boolean;
} {
  const balance = input.totalIncome - input.totalExpenses;

  let totalAllocated = 0;
  const categoryRows: BudgetCategoryRow[] = input.categories.map((cat) => {
    const allocated = input.allocationMap.get(cat.id) ?? 0;
    const spent = input.spentByCategory[cat.id] ?? 0;

    totalAllocated += allocated;
    const remaining = allocated - spent;
    const spentByUser: Record<number, number> = {};
    for (const e of input.expenses) {
      if (e.categoryId !== cat.id) continue;
      spentByUser[e.userId] = (spentByUser[e.userId] ?? 0) + e.amount;
    }

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      groupName: cat.groupName,
      costType: cat.costType ?? "variable",
      allocated,
      spent,
      remaining,
      isOverspent: remaining < 0,
      spentByUser,
    };
  });

  const unallocated = input.totalIncome - totalAllocated;
  const isBalanced = unallocated === 0;

  return { balance, totalAllocated, categoryRows, unallocated, isBalanced };
}

export interface BudgetAdherenceRow {
  categoryName: string;
  allocated: number;
  spent: number;
  adherencePct: number;
}

export interface MonthlySnapshotResult {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  netPosition: number;
  budgetAdherence: BudgetAdherenceRow[];
  expensesByUser: Record<number, number>;
  incomeByUser: Record<number, number>;
}

export function calculateMonthlySnapshotArithmetic(input: {
  month: string;
  incomeEntries: Array<{ userId: number; amount: number }>;
  totalExpenses: number;
  spentByCategory: Record<number, number>;
  allocations: Array<{ categoryId: number; allocatedAmount: number }>;
  categoryIdToName: Map<number, string>;
  expensesByUser: Record<number, number>;
}): MonthlySnapshotResult {
  const totalIncome = input.incomeEntries.reduce((sum, e) => sum + e.amount, 0);
  const netPosition = totalIncome - input.totalExpenses;

  const allocationMap = new Map(input.allocations.map((a) => [a.categoryId, a.allocatedAmount]));
  const categoryIds = new Set<number>([
    ...Object.keys(input.spentByCategory).map(Number),
    ...allocationMap.keys(),
  ]);

  const budgetAdherence: BudgetAdherenceRow[] = Array.from(categoryIds).map((categoryId) => {
    const allocated = allocationMap.get(categoryId) ?? 0;
    const spent = input.spentByCategory[categoryId] ?? 0;
    const categoryName = input.categoryIdToName.get(categoryId) ?? "?";
    const adherencePct = allocated > 0 ? (spent / allocated) * 100 : 0;
    return { categoryName, allocated, spent, adherencePct };
  });

  const incomeByUser: Record<number, number> = {};
  for (const e of input.incomeEntries) {
    incomeByUser[e.userId] = (incomeByUser[e.userId] ?? 0) + e.amount;
  }

  return {
    month: input.month,
    totalIncome,
    totalExpenses: input.totalExpenses,
    netPosition,
    budgetAdherence,
    expensesByUser: input.expensesByUser,
    incomeByUser,
  };
}

export interface SplitAllocationBalanceRow {
  paidByUserId: number;
  paidByUserName: string;
  allocationUserId: number;
  allocationUserName: string;
  amount: number;
}

export interface SplitSettlementRow {
  payerUserId: number;
  payerUserName: string;
  recipientUserId: number;
  recipientUserName: string;
  amount: number;
}

/**
 * Pure counterpart of `SplitService.getBalance`.
 * Converts in-memory allocations + settlements into the signed "owed" picture.
 */
export function calculateSplitBalance(input: {
  currentUserId: number;
  allocations: SplitAllocationBalanceRow[];
  settlements: SplitSettlementRow[];
}): SplitBalance {
  const perUserMap = new Map<
    number,
    { userId: number; userName: string; owedToMe: number; iOwe: number }
  >();

  for (const row of input.allocations) {
    if (row.paidByUserId === input.currentUserId && row.allocationUserId !== input.currentUserId) {
      const existing =
        perUserMap.get(row.allocationUserId) ?? {
          userId: row.allocationUserId,
          userName: row.allocationUserName,
          owedToMe: 0,
          iOwe: 0,
        };
      existing.owedToMe += row.amount;
      perUserMap.set(row.allocationUserId, existing);
    } else if (row.allocationUserId === input.currentUserId) {
      const existing =
        perUserMap.get(row.paidByUserId) ?? {
          userId: row.paidByUserId,
          userName: row.paidByUserName,
          owedToMe: 0,
          iOwe: 0,
        };
      existing.iOwe += row.amount;
      perUserMap.set(row.paidByUserId, existing);
    }
  }

  for (const s of input.settlements) {
    if (s.recipientUserId === input.currentUserId) {
      const existing =
        perUserMap.get(s.payerUserId) ?? {
          userId: s.payerUserId,
          userName: s.payerUserName,
          owedToMe: 0,
          iOwe: 0,
        };
      existing.owedToMe -= s.amount;
      perUserMap.set(s.payerUserId, existing);
    } else {
      const existing =
        perUserMap.get(s.recipientUserId) ?? {
          userId: s.recipientUserId,
          userName: s.recipientUserName,
          owedToMe: 0,
          iOwe: 0,
        };
      existing.iOwe -= s.amount;
      perUserMap.set(s.recipientUserId, existing);
    }
  }

  let owedToMe = 0;
  let iOwe = 0;
  for (const u of perUserMap.values()) {
    if (u.owedToMe > 0) owedToMe += u.owedToMe;
    if (u.iOwe > 0) iOwe += u.iOwe;
  }

  const perUser = Array.from(perUserMap.values());
  return {
    owedToMe,
    iOwe,
    net: owedToMe - iOwe,
    perUser,
  };
}

export function splitExpense(input: { amount: number; users: string[] }): Record<string, number> {
  const users = input.users;
  const amount = input.amount;
  if (users.length === 0) return {};

  const base = Math.trunc(amount / users.length);
  const remainder = amount - base * users.length;

  // Distribute remaining units deterministically to the first N users.
  const out: Record<string, number> = {};
  for (const u of users) out[u] = base;
  const step = remainder >= 0 ? 1 : -1;
  let remaining = Math.abs(remainder);
  for (const u of users) {
    if (remaining <= 0) break;
    out[u] += step;
    remaining -= 1;
  }
  return out;
}

export function splitExpenseWithRatios(input: {
  amount: number;
  splits: Record<string, number>;
}): Record<string, number> {
  const keys = Object.keys(input.splits);
  if (keys.length === 0) return {};

  const weightSum = keys.reduce((s, k) => s + input.splits[k], 0);
  if (weightSum === 0) return Object.fromEntries(keys.map((k) => [k, 0]));

  // Convert weights into exact integer shares by rounding down, then distributing remainder
  // based on fractional parts to keep the sum stable.
  const rawShares = keys.map((k) => (input.amount * input.splits[k]) / weightSum);
  const floorShares = rawShares.map((x) => Math.trunc(x));
  let allocated = floorShares.reduce((s, x) => s + x, 0);
  let remainder = input.amount - allocated;

  const out: Record<string, number> = {};
  for (let i = 0; i < keys.length; i++) out[keys[i]!] = floorShares[i]!;

  // Distribute remainder one unit at a time deterministically.
  const step = remainder >= 0 ? 1 : -1;
  remainder = Math.abs(remainder);

  while (remainder > 0) {
    // Prefer users with the largest fractional part (or least negative when amount is negative).
    let bestIdx = 0;
    let bestFrac = -Infinity;
    for (let i = 0; i < keys.length; i++) {
      const frac = rawShares[i] - floorShares[i];
      if (frac > bestFrac) {
        bestFrac = frac;
        bestIdx = i;
      }
    }
    out[keys[bestIdx]!] += step;
    remainder -= 1;
    // After distributing, fractional parts effectively shift, but for simplicity we recompute each loop.
  }

  return out;
}

