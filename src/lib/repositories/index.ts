import { CategoryRepository } from "./sqlite/category.repository";
import { ExpenseRepository } from "./sqlite/expense.repository";
import { IncomeRepository } from "./sqlite/income.repository";
import { UserRepository } from "./sqlite/user.repository";
import type { ICategoryRepository } from "./interfaces/category.repository";
import type { IExpenseRepository } from "./interfaces/expense.repository";
import type { IIncomeRepository } from "./interfaces/income.repository";
import type { IUserRepository } from "./interfaces/user.repository";
import { BudgetRepository } from "./sqlite/budget.repository";
import { MortgageRepository } from "./sqlite/mortgage.repository";
import type { IBudgetRepository } from "./interfaces/budget.repository";
import type { IMortgageRepository } from "./interfaces/mortgage.repository";

let categoryRepo: ICategoryRepository | null = null;
let expenseRepo: IExpenseRepository | null = null;
let incomeRepo: IIncomeRepository | null = null;
let userRepo: IUserRepository | null = null;
let budgetRepo: IBudgetRepository | null = null;
let mortgageRepo: IMortgageRepository | null = null;

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

export function getBudgetRepository(): IBudgetRepository {
  if (!budgetRepo) budgetRepo = new BudgetRepository();
  return budgetRepo;
}

export function getMortgageRepository(): IMortgageRepository {
  if (!mortgageRepo) mortgageRepo = new MortgageRepository();
  return mortgageRepo;
}

