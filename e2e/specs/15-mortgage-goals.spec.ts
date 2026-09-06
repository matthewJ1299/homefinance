import { test, expect } from "../fixtures/test";
import { loginAsMatt, skipWelcomeIfPresent } from "../helpers/auth";
import { addExpense, createGoalCategory, recordMortgageExtraPayment } from "../helpers/finance";
import { clearNewMonthIfPresent, goNav } from "../helpers/nav";

test.describe.configure({ mode: "serial" });

test.describe("Mortgage + Goals mutations", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    await page.goto("/dashboard");
    await skipWelcomeIfPresent(page);
    await clearNewMonthIfPresent(page);
  });

  test("mortgage page shows summary and records an extra payment", async ({ page }) => {
    await goNav(page, "Mortgage");
    await expect(page.getByRole("heading", { name: /Mortgage/i }).first()).toBeVisible();
    // The headline is now share of what's paid for so far.
    await expect(page.getByText("You own")).toBeVisible();
    await expect(page.getByText("of what’s paid for so far")).toBeVisible();

    const note = `e2e-mortgage-${Date.now()}`;
    await recordMortgageExtraPayment(page, { amount: "500.00", note });
    await expect(page.getByText(note).first()).toBeVisible({ timeout: 20_000 });
  });

  test("log a Mortgage-category expense (regular bond payment path)", async ({ page }) => {
    const note = `e2e-bond-${Date.now()}`;
    // App treats Mortgage-category expenses as bond activity; there is no separate "pay month" button.
    await addExpense(page, { amount: "12500.00", categoryName: "Mortgage", note });
  });

  test("interest rate changes section is available behind More details", async ({ page }) => {
    await goNav(page, "Mortgage");
    await page.getByRole("button", { name: /More details/i }).first().click();
    await page.getByText("Interest rate changes").click();
    await expect(
      page.getByRole("button", { name: /Add rate change|Save rate schedule/i }).first()
    ).toBeVisible();
  });

  test("a goal is a category with a target", async ({ page }) => {
    await createGoalCategory(page, {
      categoryName: "Savings",
      target: "10000",
      targetDate: "2027-06-30",
    });

    await goNav(page, "Goals");
    await expect(page.getByRole("heading", { name: "Goals" })).toBeVisible();
    await expect(page.getByText("Savings").first()).toBeVisible();
    // The monthly figure is derived from the target and the months left.
    await expect(page.getByText(/\/mo|Done/).first()).toBeVisible();
  });

  test("Goals sends you to Budget to assign, rather than offering a second way", async ({
    page,
  }) => {
    await goNav(page, "Goals");
    await expect(page.getByRole("link", { name: "it all happens on Budget" })).toBeVisible();
  });
});
