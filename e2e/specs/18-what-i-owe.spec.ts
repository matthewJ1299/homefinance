import { test, expect } from "../fixtures/test";
import { loginAsMatt, skipWelcomeIfPresent } from "../helpers/auth";
import { addExpense } from "../helpers/finance";
import { goNav } from "../helpers/nav";

test.describe.configure({ mode: "serial" });

test.describe("What I owe statement", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    await page.goto("/dashboard");
    await skipWelcomeIfPresent(page);
  });

  test("statement loads both directions after a split", async ({ page }) => {
    const note = `e2e-owe-${Date.now()}`;
    await addExpense(page, {
      amount: "90.00",
      categoryName: "Groceries",
      note,
      split: { withNames: ["Sydney"] },
    });

    await goNav(page, "What I owe");
    await expect(page.getByTestId("feature-unavailable")).toHaveCount(0);
    await expect(page.getByText(/What you owe|What .+ owes you/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Print" })).toBeVisible();
    await expect(page.getByText(/Split balance|Total|mortgage/i).first()).toBeVisible();

    await page.getByRole("button", { name: "Owed to me" }).click();
    await expect(page).toHaveURL(/view=owed/);
    await expect(page.getByText(/What .+ owes you/i).first()).toBeVisible();
  });
});
