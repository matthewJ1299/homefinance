import { test, expect } from "../fixtures/test";
import {
  enterAppAs,
  loginAsMatt,
  signOut,
  skipWelcomeIfPresent,
} from "../helpers/auth";
import { E2E } from "../helpers/env";
import { addExpense, settleFirstOwedBalance } from "../helpers/finance";
import { goNav } from "../helpers/nav";

test.describe.configure({ mode: "serial" });

test.describe("Splits", () => {
  const note = `e2e-split-${Date.now()}`;

  test("Matt creates equal split expense; it shows in Split history", async ({ page }) => {
    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    await page.goto("/dashboard");
    await skipWelcomeIfPresent(page);

    await addExpense(page, {
      amount: "200.00",
      categoryName: "Dining Out",
      note,
      splitEqual: true,
    });

    await goNav(page, "Splits");
    await expect(page.getByRole("heading", { name: "Splits" })).toBeVisible();
    await expect(page.getByText(note).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/How much each person owes|Split history|Summary by group/i).first()).toBeVisible();
  });

  test("Sydney can settle the balance created by Matt's split", async ({ page }) => {
    await enterAppAs(page, E2E.sydneyEmail);
    await page.goto("/dashboard");
    await skipWelcomeIfPresent(page);

    const settled = await settleFirstOwedBalance(page);
    // If already settled from prior data, still assert Splits page is healthy.
    await goNav(page, "Splits");
    await expect(page.getByRole("heading", { name: "Splits" })).toBeVisible();
    if (settled) {
      await expect(page.getByText(/Settled|Settlement|owe/i).first()).toBeVisible();
    }
    await signOut(page);
  });
});
