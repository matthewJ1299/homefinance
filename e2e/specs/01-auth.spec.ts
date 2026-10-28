import { test, expect } from "../fixtures/test";
import { loginAs, loginAsMatt, loginAsSydney, signOut, skipWelcomeIfPresent } from "../helpers/auth";
import { E2E } from "../helpers/env";

test.describe.configure({ mode: "serial" });

test.describe("Auth — login & session", () => {
  test("login page links to register", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "HomeFinance" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Register" })).toHaveAttribute("href", "/register");
  });

  test("invalid credentials show error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E.mattEmail);
    await page.getByLabel("Password").fill("definitely-wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Invalid email or password.")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("Matt (super-admin) can sign in and reach Home", async ({ page }) => {
    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    await expect(page).toHaveURL(/\/(dashboard|welcome)/);
    if (page.url().includes("/dashboard")) {
      await expect(page.getByRole("link", { name: "Admin" }).first()).toBeVisible();
    }
  });

  test("Sydney can sign in and is not a super-admin", async ({ page }) => {
    await loginAsSydney(page);
    await skipWelcomeIfPresent(page);
    await expect(page).toHaveURL(/\/(dashboard|welcome)/);
    await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);
  });

  test("non–super-admin cannot open /admin", async ({ page }) => {
    await loginAsSydney(page);
    await skipWelcomeIfPresent(page);
    await page.goto("/admin/houses");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "Houses" })).toHaveCount(0);
  });

  test("sign out returns to login", async ({ page }) => {
    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    await page.goto("/dashboard");
    await skipWelcomeIfPresent(page);
    await signOut(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test("re-login keeps household context (Home loads)", async ({ page }) => {
    await loginAs(page, E2E.mattEmail);
    await skipWelcomeIfPresent(page);
    await page.goto("/dashboard");
    await skipWelcomeIfPresent(page);
    await expect(page.locator("body")).not.toContainText("Missing household context");
  });
});
