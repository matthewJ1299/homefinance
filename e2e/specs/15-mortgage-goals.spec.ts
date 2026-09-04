import { test, expect } from "../fixtures/test";
import { loginAsMatt, skipWelcomeIfPresent } from "../helpers/auth";
import { addExpense, createSavingsGoal, recordMortgageExtraPayment } from "../helpers/finance";
import { uniqueName } from "../helpers/env";
import { goNav } from "../helpers/nav";

test.describe.configure({ mode: "serial" });

test.describe("Mortgage + Goals mutations", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    await page.goto("/dashboard");
    await skipWelcomeIfPresent(page);
  });

  test("mortgage page shows summary and records an extra payment", async ({ page }) => {
    await goNav(page, "Mortgage");
    await expect(page.getByRole("heading", { name: /Mortgage/i }).first()).toBeVisible();
    await expect(page.getByText(/At a glance|Pay a bit extra/i).first()).toBeVisible();

    const note = `e2e-mortgage-${Date.now()}`;
    await recordMortgageExtraPayment(page, { amount: "500.00", note });
    await expect(page.getByText(note).first()).toBeVisible({ timeout: 20_000 });
  });

  test("log a Mortgage-category expense (regular bond payment path)", async ({ page }) => {
    const note = `e2e-bond-${Date.now()}`;
    // App treats Mortgage-category expenses as bond activity; there is no separate "pay month" button.
    await addExpense(page, { amount: "12500.00", categoryName: "Mortgage", note });
  });

  test("interest rate changes section is available", async ({ page }) => {
    await goNav(page, "Mortgage");
    await page.getByText("Interest rate changes").click();
    await expect(
      page.getByRole("button", { name: /Add rate change|Save rate schedule/i }).first()
    ).toBeVisible();
  });

  test("create a savings goal", async ({ page }) => {
    const name = uniqueName("E2E Goal");
    await createSavingsGoal(page, { name, target: "10000", monthly: "500" });
  });

  test("seeded goals are listed", async ({ page }) => {
    await goNav(page, "Goals");
    await expect(page.getByText(/Emergency fund|Credit card payoff|E2E Goal/i).first()).toBeVisible();
  });
});
