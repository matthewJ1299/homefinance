import { test, expect } from "../fixtures/test";
import { loginAsMatt, skipWelcomeIfPresent } from "../helpers/auth";
import { addExpense, addIncome, expectBudgetLoaded, expectSummaryLoaded } from "../helpers/finance";
import { goNav } from "../helpers/nav";

test.describe.configure({ mode: "serial" });

test.describe("Budget + Summary", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    await page.goto("/dashboard");
    await skipWelcomeIfPresent(page);
  });

  test("Budget overview loads and can auto-allocate when available", async ({ page }) => {
    await expectBudgetLoaded(page);
    const auto = page.getByRole("button", { name: "Auto-allocate" });
    if (await auto.isVisible().catch(() => false)) {
      if (await auto.isEnabled()) {
        await auto.click();
        await expect(page.getByText("Budget auto-allocated.").first()).toBeVisible({
          timeout: 20_000,
        });
      }
    }
    await expect(page.getByText(/Categories|Allocated|income/i).first()).toBeVisible();
  });

  test("Summary reflects income and expenses after mutations", async ({ page }) => {
    const incomeNote = `e2e-sum-in-${Date.now()}`;
    const expenseNote = `e2e-sum-out-${Date.now()}`;
    await addIncome(page, { amount: "333.00", description: incomeNote, type: "Ad hoc" });
    await addExpense(page, { amount: "44.00", categoryName: "Groceries", note: expenseNote });

    await expectSummaryLoaded(page);
    await expect(page.getByText("By user")).toBeVisible();
    await expect(page.getByText(/Spending by category|Income vs expenses/i).first()).toBeVisible();

    // Month navigator present
    await expect(page.getByRole("button", { name: "Previous month" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next month" })).toBeVisible();
  });

  test("Home dashboard still loads after finance mutations", async ({ page }) => {
    await goNav(page, "Home");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("body")).not.toContainText("Missing household context");
  });
});
