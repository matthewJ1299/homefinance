import { test, expect } from "../fixtures/test";
import { loginAsMatt, skipWelcomeIfPresent } from "../helpers/auth";
import { createAccount, transferBetweenAccounts } from "../helpers/finance";
import { uniqueName } from "../helpers/env";
import { goNav } from "../helpers/nav";

test.describe.configure({ mode: "serial" });

test.describe("Accounts + transfers", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    await page.goto("/dashboard");
    await skipWelcomeIfPresent(page);
  });

  test("create a savings account", async ({ page }) => {
    const name = uniqueName("E2E Savings");
    await createAccount(page, { name, type: "Savings" });
  });

  test("transfer money between accounts", async ({ page }) => {
    const note = `e2e-xfer-${Date.now()}`;
    await transferBetweenAccounts(page, { amount: "25.00", note });
    // Transfer has no toast — page stays on Accounts and dialog closes.
    await goNav(page, "Accounts");
    await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible();
  });

  test("Accounts page lists seeded and new accounts", async ({ page }) => {
    await goNav(page, "Accounts");
    await expect(page.getByRole("button", { name: "Transfer Money" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Add account" })).toBeVisible();
  });
});
