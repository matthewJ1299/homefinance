import { CategoryRepository } from "./sqlite/category.repository";
import { ExpenseRepository } from "./sqlite/expense.repository";
import { IncomeRepository } from "./sqlite/income.repository";
import { UserRepository } from "./sqlite/user.repository";
import { SplitAllocationRepository } from "./sqlite/split-allocation.repository";
import { SplitSettlementRepository } from "./sqlite/split-settlement.repository";
import type { ICategoryRepository } from "./interfaces/category.repository";
import type { IExpenseRepository } from "./interfaces/expense.repository";
import type { IIncomeRepository } from "./interfaces/income.repository";
import type { IUserRepository } from "./interfaces/user.repository";
import type { ISplitAllocationRepository } from "./interfaces/split-allocation.repository";
import type { ISplitSettlementRepository } from "./interfaces/split-settlement.repository";
import type { ISplitGroupRepository } from "./interfaces/split-group.repository";
import type { IRecurringIncomeRepository } from "./interfaces/recurring-income.repository";
import type { IRecurringExpenseRepository } from "./interfaces/recurring-expense.repository";
import { SplitGroupRepository } from "./sqlite/split-group.repository";
import { RecurringIncomeRepository } from "./sqlite/recurring-income.repository";
import { RecurringExpenseRepository } from "./sqlite/recurring-expense.repository";
import { BudgetRepository } from "./sqlite/budget.repository";
import { MortgageRepository } from "./sqlite/mortgage.repository";
import type { IBudgetRepository } from "./interfaces/budget.repository";
import type { IMortgageRepository } from "./interfaces/mortgage.repository";
import type { ICalendarEventRepository } from "./interfaces/calendar-event.repository";
import { CalendarEventRepository } from "./sqlite/calendar-event.repository";
import type { ISharedListRepository } from "./interfaces/shared-list.repository";
import type { ISharedListItemRepository } from "./interfaces/shared-list-item.repository";
import type { IPushSubscriptionRepository } from "./interfaces/push-subscription.repository";
import type { ISentReminderRepository } from "./interfaces/sent-reminder.repository";
import { SharedListRepository } from "./sqlite/shared-list.repository";
import { SharedListItemRepository } from "./sqlite/shared-list-item.repository";
import { PushSubscriptionRepository } from "./sqlite/push-subscription.repository";
import { SentReminderRepository } from "./sqlite/sent-reminder.repository";
import type { IAccountRepository } from "./interfaces/account.repository";
import type { IAccountTransactionRepository } from "./interfaces/account-transaction.repository";
import type { ITransferRepository } from "./interfaces/transfer.repository";
import type { IGoalRepository } from "./interfaces/goal.repository";
import type { IGoalContributionRepository } from "./interfaces/goal-contribution.repository";
import { AccountRepository } from "./sqlite/account.repository";
import { AccountTransactionRepository } from "./sqlite/account-transaction.repository";
import { TransferRepository } from "./sqlite/transfer.repository";
import { GoalRepository } from "./sqlite/goal.repository";
import { GoalContributionRepository } from "./sqlite/goal-contribution.repository";

let categoryRepo: ICategoryRepository | null = null;
let expenseRepo: IExpenseRepository | null = null;
let incomeRepo: IIncomeRepository | null = null;
let userRepo: IUserRepository | null = null;
let splitAllocationRepo: ISplitAllocationRepository | null = null;
let splitSettlementRepo: ISplitSettlementRepository | null = null;
let splitGroupRepo: ISplitGroupRepository | null = null;
let recurringIncomeRepo: IRecurringIncomeRepository | null = null;
let recurringExpenseRepo: IRecurringExpenseRepository | null = null;
let budgetRepo: IBudgetRepository | null = null;
let mortgageRepo: IMortgageRepository | null = null;
let calendarEventRepo: ICalendarEventRepository | null = null;
let sharedListRepo: ISharedListRepository | null = null;
let sharedListItemRepo: ISharedListItemRepository | null = null;
let pushSubscriptionRepo: IPushSubscriptionRepository | null = null;
let sentReminderRepo: ISentReminderRepository | null = null;
let accountRepo: IAccountRepository | null = null;
let accountTransactionRepo: IAccountTransactionRepository | null = null;
let transferRepo: ITransferRepository | null = null;
let goalRepo: IGoalRepository | null = null;
let goalContributionRepo: IGoalContributionRepository | null = null;

export function getCategoryRepository(): ICategoryRepository {
  if (!categoryRepo) categoryRepo = new CategoryRepository();
  return categoryRepo;
}

export function getExpenseRepository(): IExpenseRepository {
  if (!expenseRepo) expenseRepo = new ExpenseRepository();
  return expenseRepo;
}

export function getIncomeRepository(): IIncomeRepository {
  if (!incomeRepo) incomeRepo = new IncomeRepository();
  return incomeRepo;
}

export function getUserRepository(): IUserRepository {
  if (!userRepo) userRepo = new UserRepository();
  return userRepo;
}

export function getSplitAllocationRepository(): ISplitAllocationRepository {
  if (!splitAllocationRepo) splitAllocationRepo = new SplitAllocationRepository();
  return splitAllocationRepo;
}

export function getSplitSettlementRepository(): ISplitSettlementRepository {
  if (!splitSettlementRepo) splitSettlementRepo = new SplitSettlementRepository();
  return splitSettlementRepo;
}

export function getSplitGroupRepository(): ISplitGroupRepository {
  if (!splitGroupRepo) splitGroupRepo = new SplitGroupRepository();
  return splitGroupRepo;
}

export function getRecurringIncomeRepository(): IRecurringIncomeRepository {
  if (!recurringIncomeRepo) recurringIncomeRepo = new RecurringIncomeRepository();
  return recurringIncomeRepo;
}

export function getRecurringExpenseRepository(): IRecurringExpenseRepository {
  if (!recurringExpenseRepo) recurringExpenseRepo = new RecurringExpenseRepository();
  return recurringExpenseRepo;
}

export function getBudgetRepository(): IBudgetRepository {
  if (!budgetRepo) budgetRepo = new BudgetRepository();
  return budgetRepo;
}

export function getMortgageRepository(): IMortgageRepository {
  if (!mortgageRepo) mortgageRepo = new MortgageRepository();
  return mortgageRepo;
}

export function getCalendarEventRepository(): ICalendarEventRepository {
  if (!calendarEventRepo) calendarEventRepo = new CalendarEventRepository();
  return calendarEventRepo;
}

export function getSharedListRepository(): ISharedListRepository {
  if (!sharedListRepo) sharedListRepo = new SharedListRepository();
  return sharedListRepo;
}

export function getSharedListItemRepository(): ISharedListItemRepository {
  if (!sharedListItemRepo) sharedListItemRepo = new SharedListItemRepository();
  return sharedListItemRepo;
}

export function getPushSubscriptionRepository(): IPushSubscriptionRepository {
  if (!pushSubscriptionRepo) pushSubscriptionRepo = new PushSubscriptionRepository();
  return pushSubscriptionRepo;
}

export function getSentReminderRepository(): ISentReminderRepository {
  if (!sentReminderRepo) sentReminderRepo = new SentReminderRepository();
  return sentReminderRepo;
}

export function getAccountRepository(): IAccountRepository {
  if (!accountRepo) accountRepo = new AccountRepository();
  return accountRepo;
}

export function getAccountTransactionRepository(): IAccountTransactionRepository {
  if (!accountTransactionRepo)
    accountTransactionRepo = new AccountTransactionRepository();
  return accountTransactionRepo;
}

export function getTransferRepository(): ITransferRepository {
  if (!transferRepo) transferRepo = new TransferRepository();
  return transferRepo;
}

export function getGoalRepository(): IGoalRepository {
  if (!goalRepo) goalRepo = new GoalRepository();
  return goalRepo;
}

export function getGoalContributionRepository(): IGoalContributionRepository {
  if (!goalContributionRepo) goalContributionRepo = new GoalContributionRepository();
  return goalContributionRepo;
}

