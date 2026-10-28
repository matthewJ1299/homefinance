import { test, expect } from "../fixtures/test";
import { loginAsMatt, skipWelcomeIfPresent } from "../helpers/auth";

test.describe("Theme / layout smoke", () => {
  test("desktop sidebar shows Home and Admin for Matt", async ({ page }) => {
    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    await page.goto("/dashboard");
    await skipWelcomeIfPresent(page);

    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link", { name: "Home" }).first()).toBeVisible();
    await expect(nav.getByRole("link", { name: "Admin" }).first()).toBeVisible();
    await expect(nav.getByRole("button", { name: "Sign out" }).or(page.getByRole("button", { name: "Sign out" }))).toBeVisible();
  });

  test("light theme tokens render without crash", async ({ page }) => {
    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    await page.goto("/dashboard");
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("dark theme tokens render without crash", async ({ page }) => {
    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    await page.goto("/dashboard");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("body")).toBeVisible();
  });
});
