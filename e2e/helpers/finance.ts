import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { goNav } from "./nav";

export async function expectToast(page: Page, text: string | RegExp): Promise<void> {
  await expect(page.getByText(text).first()).toBeVisible({ timeout: 20_000 });
}

/** Add a normal expense from Transactions (/expenses). */
export async function addExpense(
  page: Page,
  input: {
    amount: string;
    categoryName?: string;
    note?: string;
    splitEqual?: boolean;
  }
): Promise<void> {
  await goNav(page, "Transactions");
  await expect(page.getByRole("heading", { name: "Transactions" })).toBeVisible();

  const amountInput = page.locator("#quick-amount");
  await amountInput.fill(input.amount);
  const addBtn = page.getByRole("button", { name: "Add", exact: true });
  await expect(addBtn).toBeEnabled({ timeout: 20_000 });
  await addBtn.click();

  const dialog = page.locator("dialog").filter({ hasText: "Choose category" });
  await expect(dialog).toBeVisible();

  const category = input.categoryName ?? "Groceries";
  const categoryBtn = dialog.getByRole("button", { name: new RegExp(`^${escapeRegex(category)}`) });
  if ((await categoryBtn.count()) === 0) {
    await dialog.getByRole("button", { name: "Show more" }).click();
  }
  await categoryBtn.first().click();

  if (input.note) {
    await dialog.getByPlaceholder("Note (optional)").fill(input.note);
  }

  if (input.splitEqual) {
    await dialog.getByText("Split this expense").click();
    await dialog.getByText("I paid, split equally").click();
  }

  await dialog.getByRole("button", { name: "Add expense" }).click();
  await expectToast(page, "Expense added.");
  if (input.note) {
    await expect(page.getByText(input.note).first()).toBeVisible({ timeout: 20_000 });
  }
}

export async function addIncome(
  page: Page,
  input: { amount: string; description: string; type?: "Salary" | "Ad hoc" }
): Promise<void> {
  await goNav(page, "Income");
  await expect(page.getByRole("heading", { name: "Income" })).toBeVisible();
  await page.locator("#income-amount").fill(input.amount);
  if (input.type === "Ad hoc") {
    await page.getByRole("button", { name: "Ad hoc" }).click();
  }
  await page.locator("#income-desc").fill(input.description);
  await page.getByRole("button", { name: "Add income" }).click();
  await expectToast(page, "Income added.");
  await expect(page.getByText(input.description).first()).toBeVisible({ timeout: 20_000 });
}

export async function createAccount(
  page: Page,
  input: { name: string; type?: "Bank" | "Savings" | "Credit" }
): Promise<void> {
  await goNav(page, "Accounts");
  await page.getByRole("button", { name: "Add account" }).click();
  await page.getByLabel("Account name").fill(input.name);
  if (input.type && input.type !== "Bank") {
    await page.getByLabel("Type").selectOption({ label: input.type });
  }
  await page.getByRole("button", { name: "Add account" }).click();
  await expectToast(page, "Account created.");
  await expect(page.getByText(input.name).first()).toBeVisible();
}

/** Transfer between first two real account options (seeded Matt has ≥2). */
export async function transferBetweenAccounts(
  page: Page,
  input: { amount: string; note: string }
): Promise<void> {
  await goNav(page, "Accounts");
  await page.getByRole("button", { name: "Transfer Money" }).click();
  const dialog = page.locator("dialog").filter({ hasText: "Transfer Money" });
  await expect(dialog).toBeVisible();

  await dialog.locator("#transfer-from").selectOption({ index: 1 });
  await dialog.locator("#transfer-to").selectOption({ index: 2 });
  await dialog.locator("#transfer-amount").fill(input.amount);
  await dialog.locator("#transfer-note").fill(input.note);
  await dialog.getByRole("button", { name: "Transfer", exact: true }).click();
  await expect(dialog).toHaveCount(0, { timeout: 20_000 });
}

export async function recordMortgageExtraPayment(
  page: Page,
  input: { amount: string; note: string }
): Promise<void> {
  await goNav(page, "Mortgage");
  await expect(page.getByTestId("feature-unavailable")).toHaveCount(0);
  const form = page.getByTestId("mortgage-extra-payment");
  await form.getByLabel("Amount (R)").fill(input.amount);
  await form.getByLabel("Note (optional)").fill(input.note);
  await form.getByRole("button", { name: "Record extra payment" }).click();
  await expectToast(page, "Extra payment recorded.");
}

export async function createSavingsGoal(
  page: Page,
  input: { name: string; target: string; monthly: string }
): Promise<void> {
  await goNav(page, "Goals");
  await expect(page.getByTestId("feature-unavailable")).toHaveCount(0);
  await page.getByRole("button", { name: "Add goal" }).click();
  const form = page.locator("div.rounded-lg.border").filter({ hasText: "New goal" }).first();
  await expect(form.getByRole("heading", { name: "New goal" })).toBeVisible();
  await form.getByPlaceholder("e.g. Car").fill(input.name);
  const amounts = form.getByPlaceholder("0.00");
  await amounts.nth(0).fill(input.target);
  await amounts.nth(1).fill(input.monthly);
  await form.getByRole("button", { name: "Add goal" }).click();
  await expectToast(page, "Goal created.");
  await expect(page.getByText(input.name).first()).toBeVisible({ timeout: 20_000 });
}

export async function settleFirstOwedBalance(page: Page): Promise<boolean> {
  await goNav(page, "Splits");
  const settle = page.getByRole("button", { name: "Settle" }).first();
  if ((await settle.count()) === 0) return false;
  await settle.click();
  const dialog = page.locator("dialog").filter({ hasText: /Settle with/ });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Settle", exact: true }).click();
  await expectToast(page, "Settlement recorded.");
  return true;
}

export async function addListItemOnFirstList(page: Page, label: string): Promise<void> {
  await goNav(page, "Lists");
  await page.getByRole("link", { name: "Open" }).first().click();
  await page.getByLabel("Label").fill(label);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expectToast(page, "Item added.");
  await expect(page.getByText(label).first()).toBeVisible();
}

export async function createCalendarEvent(page: Page, name: string): Promise<void> {
  await goNav(page, "Calendar");
  await page.getByRole("button", { name: "Add event" }).click();
  const dialog = page.locator("dialog").filter({ hasText: "New event" });
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder("Event name").fill(name);
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog).toHaveCount(0, { timeout: 20_000 });
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 20_000 });
}

export async function expectSummaryLoaded(page: Page): Promise<void> {
  await goNav(page, "Summary");
  await expect(page.getByRole("heading", { name: "Summary" })).toBeVisible();
  await expect(page.getByText("Total income")).toBeVisible();
  await expect(page.getByText("Total expenses")).toBeVisible();
  await expect(page.getByText("Net position")).toBeVisible();
  await expect(page.getByText("Savings rate")).toBeVisible();
}

export async function expectBudgetLoaded(page: Page): Promise<void> {
  await goNav(page, "Budget");
  await expect(page.getByRole("heading", { name: "Budget" })).toBeVisible();
  await expect(page.getByText(/Allocated|To be allocated|Fully allocated/i).first()).toBeVisible();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
