import { test, expect } from "../fixtures/test";
import { loginAsMatt, skipWelcomeIfPresent } from "../helpers/auth";
import {
  addExpense,
  addIncome,
  expectBudgetLoaded,
  expectReportsLoaded,
} from "../helpers/finance";
import { clearNewMonthIfPresent, goNav } from "../helpers/nav";

test.describe.configure({ mode: "serial" });

test.describe("Budget + Reports", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    await page.goto("/dashboard");
    await skipWelcomeIfPresent(page);
    await clearNewMonthIfPresent(page);
  });

  test("Budget leads with one headline and grouped read-only rows", async ({ page }) => {
    await expectBudgetLoaded(page);

    // The donut and the four-stat grid are gone; one three-figure line remains.
    await expect(page.getByText(/in$/).first()).toBeVisible();
    await expect(page.getByText(/assigned$/).first()).toBeVisible();
    await expect(page.getByText(/spent$/).first()).toBeVisible();

    const spread = page.getByRole("button", { name: "Spread it for me" });
    if (await spread.isVisible().catch(() => false)) {
      if (await spread.isEnabled()) {
        await spread.click();
        await expect(page.getByText("Spread across your categories.").first()).toBeVisible({
          timeout: 20_000,
        });
      }
    }
  });

  test("a category row opens the sheet, and the sheet is where edits happen", async ({ page }) => {
    await goNav(page, "Budget");
    await clearNewMonthIfPresent(page);
    // Scoped to the budget rows: recent transactions on the same page also
    // carry category names.
    await page
      .getByTestId("budget-category-row")
      .filter({ hasText: "Groceries" })
      .first()
      .click();

    const sheet = page.getByRole("dialog", { name: "Groceries" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Save", exact: true })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "+R100" })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Empty it out" })).toBeVisible();
    await expect(sheet.getByText("This month")).toBeVisible();

    await page.keyboard.press("Escape");
  });

  test("Reports replaces Summary and defaults to since you started", async ({ page }) => {
    const incomeNote = `e2e-rep-in-${Date.now()}`;
    const expenseNote = `e2e-rep-out-${Date.now()}`;
    await addIncome(page, { amount: "333.00", description: incomeNote, kind: "Bonus" });
    await addExpense(page, { amount: "44.00", categoryName: "Groceries", note: expenseNote });

    await expectReportsLoaded(page);
    await expect(page.getByText(/Since you started|Nothing logged yet/)).toBeVisible();

    for (const tab of ["Categories", "Budget accuracy", "The house"]) {
      await page.getByRole("tab", { name: tab }).click();
      await expect(page.getByRole("tab", { name: tab })).toHaveAttribute("aria-selected", "true");
    }
  });

  test("/summary redirects to Reports", async ({ page }) => {
    await page.goto("/summary");
    await expect(page).toHaveURL(/\/reports/);
  });

  test("Home leads with the envelope figure and one needs-you stream", async ({ page }) => {
    await goNav(page, "Home");
    await clearNewMonthIfPresent(page);
    await expect(page).toHaveURL(/\/dashboard/);

    // Scoped to the page: the breakdown sheet sits closed in the DOM and
    // repeats the same headline.
    const main = page.getByRole("main");
    await expect(main.getByText("Left in your categories")).toBeVisible();
    await expect(main.getByRole("button", { name: "Breakdown" })).toBeVisible();
    await expect(main.getByText("Needs you")).toBeVisible();
    await expect(main.getByText("What's left, by category")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Missing household context");
  });

  test("the breakdown sheet keeps owed money below the line", async ({ page }) => {
    await goNav(page, "Home");
    await clearNewMonthIfPresent(page);
    await page.getByRole("button", { name: "Breakdown" }).click();

    const sheet = page.getByRole("dialog", { name: "Breakdown" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText("Set aside this month")).toBeVisible();
    await expect(sheet.getByText("Left in your categories")).toBeVisible();
    await expect(sheet.getByText("Owed to you", { exact: true })).toBeVisible();
    // The sentence that resolves the double-count question.
    await expect(sheet.getByText(/isn.t in an envelope yet/)).toBeVisible();

    await page.keyboard.press("Escape");
  });
});
