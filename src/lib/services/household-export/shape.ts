import type { Account, CategoryWithActive, ExpenseWithDetails } from "@/lib/types";
import type { IncomeEntry } from "@/lib/repositories/interfaces/income.repository";
import type { AccountTransactionWithEffectiveDate } from "@/lib/repositories/interfaces/account-transaction.repository";
import type { Transfer } from "@/lib/repositories/interfaces/transfer.repository";
import type { SplitSettlementWithNames } from "@/lib/repositories/interfaces/split-settlement.repository";
import type { ExpenseParticipantRow } from "@/lib/repositories/interfaces/expense-participant.repository";
import type { UserSummary } from "@/lib/repositories/interfaces/user.repository";
import type { BudgetMonthPeriod } from "@/lib/types/budget-month";
import { fromMinorUnits, formatRand } from "@/lib/utils/currency";
import { budgetMonthKeyFromIsoDate } from "@/lib/utils/date";
import { nowInAppTz } from "@/lib/utils/app-timezone";
import type { ExportBudgetMonth } from "./periods";

/**
 * The shape of the file a user downloads to hand to an LLM.
 *
 * Everything here is chosen for a reader that is not a program: a name sits
 * next to every id, every amount carries rands as well as cents, and the
 * `meta` block explains the conventions so the file needs no companion docs.
 */

export const HOUSEHOLD_EXPORT_FORMAT = "homefinance-household-export";
export const HOUSEHOLD_EXPORT_VERSION = 1;

export interface ExportMoney {
  /** Integer minor units (cents). The value the app stores. */
  minorUnits: number;
  /** Decimal rands. */
  rands: number;
  /** Formatted for display, e.g. "R 1 234,56". */
  display: string;
}

export interface ExportRef {
  id: number;
  name: string;
}

export type ExportMember = ExportRef;

export interface ExportCategory extends ExportRef {
  group: string;
  /** Stable identity for Splits / Mortgage / Unaccounted; null for ordinary categories. */
  semanticKey: string | null;
  costType: string;
  isActive: boolean;
}

export interface ExportAccount extends ExportRef {
  type: string;
  owner: ExportRef;
  isShared: boolean;
  creditLimit: ExportMoney | null;
}

export interface ExportParticipant {
  user: ExportRef;
  share: ExportMoney;
}

export interface ExportExpense {
  id: number;
  date: string;
  budgetMonth: string;
  amount: ExportMoney;
  category: ExportCategory | { id: number; name: string; group: null; semanticKey: null };
  note: string | null;
  account: ExportRef | null;
  /** Who entered the expense. */
  enteredBy: ExportRef;
  /** Who actually paid, when it is a shared spend. Null means `enteredBy`. */
  paidBy: ExportRef | null;
  isSplit: boolean;
  /** Each household member's share of a split spend. Empty when not split. */
  participants: ExportParticipant[];
  splitGroupId: string | null;
  splitExpenseGroupId: number | null;
  createdAt: string;
}

export interface ExportIncome {
  id: number;
  date: string;
  budgetMonth: string;
  amount: ExportMoney;
  /** "salary" or "ad_hoc" — the settlement flag the app keys off. */
  type: string;
  /** The user-facing taxonomy: salary, bonus, interest, gift, other. */
  kind: string;
  description: string | null;
  account: ExportRef | null;
  receivedBy: ExportRef;
  createdAt: string;
}

export interface ExportTransfer {
  id: number;
  date: string;
  budgetMonth: string;
  amount: ExportMoney;
  from: ExportRef;
  to: ExportRef;
  note: string | null;
  createdAt: string;
}

export interface ExportLedgerRow {
  id: number;
  date: string;
  budgetMonth: string;
  account: ExportRef;
  /** Signed: negative leaves the account, positive enters it. */
  amount: ExportMoney;
  transactionType: string;
  /** The expense, income or transfer that raised this row, if any. */
  source: { type: string; id: number } | null;
  note: string | null;
  createdAt: string;
}

export interface ExportSettlement {
  id: number;
  date: string;
  budgetMonth: string;
  amount: ExportMoney;
  payer: ExportRef;
  recipient: ExportRef;
  expenseId: number | null;
  incomeId: number | null;
  splitExpenseGroupId: number | null;
}

export interface ExportMonthSummary {
  budgetMonth: string;
  label: string;
  start: string;
  end: string;
  totalExpenses: ExportMoney;
  totalIncome: ExportMoney;
  net: ExportMoney;
  expenseCount: number;
  incomeCount: number;
  spendingByCategory: Array<{ category: ExportRef & { group: string | null }; total: ExportMoney; count: number }>;
}

export interface HouseholdExport {
  meta: {
    format: string;
    version: number;
    generatedAt: string;
    currency: "ZAR";
    timeZone: string;
    household: ExportRef;
    exportedBy: ExportRef;
    budgetMonthStartDay: number;
    /** Oldest first. */
    budgetMonths: ExportBudgetMonth[];
    range: BudgetMonthPeriod;
    notes: string[];
    counts: Record<string, number>;
  };
  members: ExportMember[];
  categories: ExportCategory[];
  accounts: ExportAccount[];
  monthlySummary: ExportMonthSummary[];
  expenses: ExportExpense[];
  income: ExportIncome[];
  transfers: ExportTransfer[];
  settlements: ExportSettlement[];
  ledger: ExportLedgerRow[];
}

export interface ShapeHouseholdExportInput {
  generatedAt: Date;
  household: ExportRef;
  exportedBy: ExportRef;
  budgetMonthStartDay: number;
  budgetMonths: ExportBudgetMonth[];
  members: UserSummary[];
  categories: CategoryWithActive[];
  accounts: Account[];
  expenses: ExpenseWithDetails[];
  participants: ExpenseParticipantRow[];
  income: IncomeEntry[];
  transfers: Transfer[];
  ledger: AccountTransactionWithEffectiveDate[];
  settlements: SplitSettlementWithNames[];
}

export function money(minorUnits: number): ExportMoney {
  return { minorUnits, rands: fromMinorUnits(minorUnits), display: formatRand(minorUnits) };
}

/** `created_at` arrives as a Date from pg or as a string from a fake; both become ISO. */
export function toIsoTimestamp(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

/** The app-zone calendar date a timestamp fell on. */
export function appDateOf(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? String(value).slice(0, 10) : nowInAppTz(d).date;
}

function refOrUnknown(id: number, name: string | undefined, fallback: string): ExportRef {
  return { id, name: name ?? `${fallback} ${id}` };
}

export function shapeHouseholdExport(input: ShapeHouseholdExportInput): HouseholdExport {
  const startDay = input.budgetMonthStartDay;
  const monthOf = (isoDate: string) => budgetMonthKeyFromIsoDate(isoDate, startDay);

  const memberName = new Map(input.members.map((m) => [m.id, m.name]));
  const member = (id: number) => refOrUnknown(id, memberName.get(id), "Member");

  const categories: ExportCategory[] = input.categories.map((c) => ({
    id: c.id,
    name: c.name,
    group: c.groupName,
    semanticKey: c.semanticKey,
    costType: c.costType,
    isActive: c.isActive,
  }));
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const accounts: ExportAccount[] = input.accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    owner: member(a.ownerUserId),
    isShared: a.isShared,
    creditLimit: a.creditLimit != null ? money(a.creditLimit) : null,
  }));
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));
  const account = (id: number | null | undefined): ExportRef | null =>
    id == null ? null : refOrUnknown(id, accountName.get(id), "Account");

  const participantsByExpense = new Map<number, ExpenseParticipantRow[]>();
  for (const p of input.participants) {
    const list = participantsByExpense.get(p.expenseId) ?? [];
    list.push(p);
    participantsByExpense.set(p.expenseId, list);
  }

  const expenses: ExportExpense[] = input.expenses.map((e) => {
    const participants = (participantsByExpense.get(e.id) ?? []).map((p) => ({
      user: refOrUnknown(p.userId, p.userName || memberName.get(p.userId), "Member"),
      share: money(p.shareMinor),
    }));
    // A spend is "split" when more than one person carries a share, or when a
    // single participant is someone other than the person who paid for it.
    const payerId = e.paidByUserId ?? e.userId;
    const isSplit = participants.length > 1 || participants.some((p) => p.user.id !== payerId);
    return {
      id: e.id,
      date: e.date,
      budgetMonth: monthOf(e.date),
      amount: money(e.amount),
      category: categoryById.get(e.categoryId) ?? {
        id: e.categoryId,
        name: e.categoryName,
        group: null,
        semanticKey: null,
      },
      note: e.note,
      account: account(e.accountId),
      enteredBy: refOrUnknown(e.userId, e.userName || memberName.get(e.userId), "Member"),
      paidBy: e.paidByUserId != null && e.paidByUserId !== e.userId ? member(e.paidByUserId) : null,
      isSplit,
      participants,
      splitGroupId: e.splitGroupId ?? null,
      splitExpenseGroupId: e.splitExpenseGroupId ?? null,
      createdAt: toIsoTimestamp(e.createdAt),
    };
  });

  const income: ExportIncome[] = input.income.map((i) => ({
    id: i.id,
    date: i.date,
    budgetMonth: monthOf(i.date),
    amount: money(i.amount),
    type: i.type,
    kind: i.incomeKind,
    description: i.description,
    account: account(i.accountId),
    receivedBy: refOrUnknown(i.userId, i.userName || memberName.get(i.userId), "Member"),
    createdAt: toIsoTimestamp(i.createdAt),
  }));

  const transfers: ExportTransfer[] = input.transfers.map((t) => {
    const date = appDateOf(t.createdAt);
    return {
      id: t.id,
      date,
      budgetMonth: monthOf(date),
      amount: money(t.amount),
      from: account(t.fromAccountId) as ExportRef,
      to: account(t.toAccountId) as ExportRef,
      note: t.note,
      createdAt: toIsoTimestamp(t.createdAt),
    };
  });

  const ledger: ExportLedgerRow[] = input.ledger.map((row) => ({
    id: row.id,
    date: row.effectiveDate,
    budgetMonth: monthOf(row.effectiveDate),
    account: account(row.accountId) as ExportRef,
    amount: money(row.amount),
    transactionType: row.transactionType,
    source:
      row.referenceType && row.referenceId != null
        ? { type: row.referenceType, id: row.referenceId }
        : null,
    note: row.note,
    createdAt: toIsoTimestamp(row.createdAt),
  }));

  const settlements: ExportSettlement[] = input.settlements.map((s) => ({
    id: s.id,
    date: s.date,
    budgetMonth: monthOf(s.date),
    amount: money(s.amount),
    payer: refOrUnknown(s.payerUserId, s.payerUserName || memberName.get(s.payerUserId), "Member"),
    recipient: refOrUnknown(
      s.recipientUserId,
      s.recipientUserName || memberName.get(s.recipientUserId),
      "Member"
    ),
    expenseId: s.expenseId ?? null,
    incomeId: s.incomeId ?? null,
    splitExpenseGroupId: s.splitExpenseGroupId ?? null,
  }));

  const monthlySummary = summariseMonths(input.budgetMonths, expenses, income);

  const starts = input.budgetMonths.map((m) => m.start).sort();
  const ends = input.budgetMonths.map((m) => m.end).sort();
  const range = { start: starts[0], end: ends[ends.length - 1] };

  return {
    meta: {
      format: HOUSEHOLD_EXPORT_FORMAT,
      version: HOUSEHOLD_EXPORT_VERSION,
      generatedAt: input.generatedAt.toISOString(),
      currency: "ZAR",
      timeZone: "Africa/Johannesburg",
      household: input.household,
      exportedBy: input.exportedBy,
      budgetMonthStartDay: startDay,
      budgetMonths: input.budgetMonths,
      range,
      notes: [
        "Every amount is given three ways: minorUnits (integer cents, the stored value), rands (decimal) and display (formatted).",
        "Dates are ISO yyyy-MM-dd; timestamps are ISO 8601 in UTC. Budget months start on budgetMonthStartDay, so a budgetMonth key like 2025-09 covers the window listed under meta.budgetMonths, not the calendar month.",
        "expenses are money spent by the household; income is money received. isSplit expenses carry a share per participant, and settlements record one member paying another back.",
        "transfers move money between the household's own accounts and are not spending. ledger is the account-level view of the same activity: one signed row per account movement, with source pointing at the expense, income or transfer that raised it.",
        "monthlySummary is derived from the expenses and income arrays in this file and is provided as a convenience.",
      ],
      counts: {
        members: input.members.length,
        categories: categories.length,
        accounts: accounts.length,
        expenses: expenses.length,
        income: income.length,
        transfers: transfers.length,
        settlements: settlements.length,
        ledger: ledger.length,
      },
    },
    members: input.members.map((m) => ({ id: m.id, name: m.name })),
    categories,
    accounts,
    monthlySummary,
    expenses,
    income,
    transfers,
    settlements,
    ledger,
  };
}

function summariseMonths(
  months: ExportBudgetMonth[],
  expenses: ExportExpense[],
  income: ExportIncome[]
): ExportMonthSummary[] {
  return months.map((m) => {
    const monthExpenses = expenses.filter((e) => e.budgetMonth === m.key);
    const monthIncome = income.filter((i) => i.budgetMonth === m.key);
    const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount.minorUnits, 0);
    const totalIncome = monthIncome.reduce((sum, i) => sum + i.amount.minorUnits, 0);

    const byCategory = new Map<number, { category: ExportRef & { group: string | null }; total: number; count: number }>();
    for (const e of monthExpenses) {
      const entry = byCategory.get(e.category.id) ?? {
        category: { id: e.category.id, name: e.category.name, group: e.category.group },
        total: 0,
        count: 0,
      };
      entry.total += e.amount.minorUnits;
      entry.count += 1;
      byCategory.set(e.category.id, entry);
    }

    return {
      budgetMonth: m.key,
      label: m.label,
      start: m.start,
      end: m.end,
      totalExpenses: money(totalExpenses),
      totalIncome: money(totalIncome),
      net: money(totalIncome - totalExpenses),
      expenseCount: monthExpenses.length,
      incomeCount: monthIncome.length,
      spendingByCategory: [...byCategory.values()]
        .sort((a, b) => b.total - a.total)
        .map((c) => ({ category: c.category, total: money(c.total), count: c.count })),
    };
  });
}
