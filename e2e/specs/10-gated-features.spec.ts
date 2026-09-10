import { test, expect } from "../fixtures/test";
import { loginAsMatt, skipWelcomeIfPresent } from "../helpers/auth";
import { ensureFeaturesEnabled } from "../helpers/admin";
import { goNav } from "../helpers/nav";

/**
 * Seeded Jordaan household has all five catalogue features enabled.
 * Deep Graph OAuth / live LLM calls are env-dependent — we assert shells load.
 */
test.describe("Gated product features (seeded entitlements)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    await page.goto("/dashboard");
    await skipWelcomeIfPresent(page);
    await ensureFeaturesEnabled(page);
  });

  test("What I owe default + owed view", async ({ page }) => {
    await goNav(page, "Statement");
    await expect(page).toHaveURL(/\/what-i-owe/);
    await expect(page.getByTestId("feature-unavailable")).toHaveCount(0);
    await page.goto("/what-i-owe?view=owed");
    await expect(page).toHaveURL(/view=owed/);
    await expect(page.getByTestId("feature-unavailable")).toHaveCount(0);
  });

  test("Mortgage page", async ({ page }) => {
    await goNav(page, "Mortgage");
    await expect(page).toHaveURL(/\/mortgage/);
    await expect(page.getByTestId("feature-unavailable")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Mortgage/i }).first()).toBeVisible();
  });

  test("Goals page", async ({ page }) => {
    await goNav(page, "Goals");
    await expect(page).toHaveURL(/\/goals/);
    await expect(page.getByTestId("feature-unavailable")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Goals" })).toBeVisible();
  });

  test("Budget AI report page shell", async ({ page }) => {
    await goNav(page, "Budget AI report");
    await expect(page).toHaveURL(/\/budget-ai-report/);
    await expect(page.getByTestId("feature-unavailable")).toHaveCount(0);
  });

  test("Recon page shell (Graph connect is optional)", async ({ page }) => {
    await goNav(page, "From your bank");
    await expect(page).toHaveURL(/\/recon/);
    await expect(page.getByTestId("feature-unavailable")).toHaveCount(0);
  });

  test("legacy /owed-to-me redirects to what-i-owe", async ({ page }) => {
    await page.goto("/owed-to-me");
    await expect(page).toHaveURL(/\/what-i-owe/);
  });
});
