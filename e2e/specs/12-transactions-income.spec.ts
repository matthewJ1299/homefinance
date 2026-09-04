import { test, expect } from "../fixtures/test";
import { loginAsMatt, skipWelcomeIfPresent } from "../helpers/auth";
import { addExpense, addIncome } from "../helpers/finance";
import { goNav } from "../helpers/nav";

test.describe.configure({ mode: "serial" });

test.describe("Transactions + income mutations", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    await page.goto("/dashboard");
    await skipWelcomeIfPresent(page);
  });

  test("add expense with note appears on Transactions and is searchable", async ({ page }) => {
    const note = `e2e-tx-${Date.now()}`;
    await addExpense(page, { amount: "87.50", categoryName: "Groceries", note });

    await goNav(page, "Transactions");
    await page.getByPlaceholder(/Note, category/i).fill(note);
    await expect(page.getByText(note).first()).toBeVisible();
  });

  test("add expense via Add hub New expense", async ({ page }) => {
    const note = `e2e-hub-${Date.now()}`;
    await goNav(page, "Add");
    await page.getByRole("button", { name: /New expense/ }).click();
    const dialog = page.locator("dialog").filter({ hasText: "Add expense" });
    await expect(dialog).toBeVisible();

    await dialog.locator("#quick-amount").fill("42.00");
    await dialog.getByRole("button", { name: "Add", exact: true }).click();

    const categoryDialog = page.locator("dialog").filter({ hasText: "Choose category" });
    await expect(categoryDialog).toBeVisible();
    await categoryDialog.getByRole("button", { name: /^Transport/ }).first().click();
    await categoryDialog.getByPlaceholder("Note (optional)").fill(note);
    await categoryDialog.getByRole("button", { name: "Add expense" }).click();
    await expect(page.getByText("Expense added.").first()).toBeVisible({ timeout: 20_000 });
  });

  test("add income appears under Income", async ({ page }) => {
    const description = `e2e-income-${Date.now()}`;
    await addIncome(page, { amount: "150.00", description, type: "Ad hoc" });
  });
});
