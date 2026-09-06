import { test, expect } from "../fixtures/test";
import { loginAsMatt, skipWelcomeIfPresent } from "../helpers/auth";
import { addExpense, addIncome } from "../helpers/finance";
import { clearNewMonthIfPresent, goNav } from "../helpers/nav";

test.describe.configure({ mode: "serial" });

test.describe("Transactions + income mutations", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    await page.goto("/dashboard");
    await skipWelcomeIfPresent(page);
    await clearNewMonthIfPresent(page);
  });

  test("add expense with note appears on Transactions and is searchable", async ({ page }) => {
    const note = `e2e-tx-${Date.now()}`;
    await addExpense(page, { amount: "87.50", categoryName: "Groceries", note });

    await goNav(page, "Transactions");
    await page.getByPlaceholder(/Note, category/i).fill(note);
    await expect(page.getByText(note).first()).toBeVisible();
  });

  test("the Add sheet states what the spend does to the category before saving", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await clearNewMonthIfPresent(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Add a spend" }).click();

    const sheet = page.getByRole("dialog", { name: "Add" });
    await expect(sheet).toBeVisible();

    // Nothing typed: the panel asks for a category rather than showing a figure.
    await expect(sheet.getByText("Pick a category")).toBeVisible();

    for (const digit of "4200") {
      await sheet.getByRole("button", { name: digit, exact: true }).click();
    }
    await sheet.getByRole("button", { name: /^Groceries/ }).first().click();

    // The whole point of the sheet: the budget effect is on screen before save.
    await expect(sheet.getByText(/comes off Groceries/)).toBeVisible();
    await expect(sheet.getByText(/will have|goes .* over/)).toBeVisible();
    await expect(sheet.getByRole("button", { name: /^Save R/ })).toBeEnabled();

    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test("/add keeps task and event only; spending lives in the sheet", async ({ page }) => {
    await goNav(page, "Add");
    await expect(page.getByText("New task")).toBeVisible();
    await expect(page.getByText("New event")).toBeVisible();
    await expect(page.getByText("New expense")).toHaveCount(0);
  });

  test("income is added from the sheet and lands in Transactions", async ({ page }) => {
    const description = `e2e-income-${Date.now()}`;
    await addIncome(page, { amount: "150.00", description, kind: "Bonus" });

    await goNav(page, "Transactions");
    await page.getByRole("button", { name: "Money in" }).click();
    await expect(page.getByText(description).first()).toBeVisible({ timeout: 20_000 });
  });

  test("/income redirects into Transactions with the income filter on", async ({ page }) => {
    await page.goto("/income");
    await expect(page).toHaveURL(/\/expenses\?type=income/);
  });

  test("Transactions has no my/theirs/combined toggle", async ({ page }) => {
    await goNav(page, "Transactions");
    await expect(page.getByRole("button", { name: "Combined" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Everything" })).toBeVisible();
  });
});
