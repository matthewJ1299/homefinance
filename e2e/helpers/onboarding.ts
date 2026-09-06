import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Drive the full /welcome six-step guide to completion. */
export async function completeOnboarding(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/welcome/);

  // Step 1 — household. Naming the house and seeing who is in it comes first,
  // and the privacy boundary is stated before anything is collected.
  await expect(page.getByRole("heading", { name: "Who's in the house?" })).toBeVisible();
  await expect(page.getByText("What they'll see")).toBeVisible();
  await expect(page.getByText(/Your budget or what you earn/)).toBeVisible();
  await page.getByLabel("House name").fill("E2E House");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 2 — accounts
  await expect(page.getByRole("heading", { name: "Where does your money sit?" })).toBeVisible();
  await page.getByLabel("Account name").fill("E2E Cheque");
  await page.getByRole("button", { name: "Add account" }).click();
  await expect(page.getByText("E2E Cheque")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 3 — payday
  await expect(page.getByRole("heading", { name: "When do you get paid?" })).toBeVisible();
  // Household-level now, so both people always see the same month.
  await expect(page.getByText(/budget month for the whole house/i)).toBeVisible();
  await page.getByRole("button", { name: "Save payday" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 4 — income
  await expect(page.getByRole("heading", { name: "What comes in each month?" })).toBeVisible();
  await page.getByLabel("Monthly amount (R)").fill("25000");
  await page.getByRole("button", { name: "Add income" }).click();
  await expect(page.getByText(/Income saved/i)).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 5 — categories
  await expect(page.getByRole("heading", { name: "What do you spend on?" })).toBeVisible();
  await expect(page.locator("label").filter({ hasText: /^Splits$/ })).toHaveCount(0);
  await expect(page.locator("label").filter({ hasText: /^Mortgage$/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 6 — budget
  await expect(page.getByRole("heading", { name: "Give every rand a job" })).toBeVisible();
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
}
