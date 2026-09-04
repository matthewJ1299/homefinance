import { test, expect } from "../fixtures/test";
import { loginAsMatt, skipWelcomeIfPresent } from "../helpers/auth";
import { goNav } from "../helpers/nav";

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
  });

  test("grouped sections and setup launcher", async ({ page }) => {
    await goNav(page, "Settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Profile" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Preferences" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Household data" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Data and export" })).toBeVisible();
    await expect(page.getByText("Household setup")).toBeVisible();
    await expect(page.getByRole("link", { name: "Open setup guide" })).toBeVisible();
    await expect(page.getByLabel("Current password")).toBeVisible();
  });

  test("no dead AI/Recon entitlement toggles", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText(/Enable AI analysis/i)).toHaveCount(0);
    await expect(page.getByText(/Enable Recon/i)).toHaveCount(0);
  });
});
