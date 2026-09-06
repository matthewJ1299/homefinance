import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { E2E } from "./env";

export async function loginAs(
  page: Page,
  email: string,
  password: string = E2E.password
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30_000 });
  await clearNewMonthGate(page);
}

export async function loginAsMatt(page: Page): Promise<void> {
  await loginAs(page, E2E.mattEmail);
}

export async function loginAsSydney(page: Page): Promise<void> {
  await loginAs(page, E2E.sydneyEmail);
}

export async function signOut(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "HomeFinance" })).toBeVisible();
}

/** Skip /welcome if the layout redirected a not_started user there. */
export async function skipWelcomeIfPresent(page: Page): Promise<void> {
  if (!page.url().includes("/welcome")) return;
  await page.getByRole("button", { name: "Skip for now" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

/**
 * Clear the month-open gate.
 *
 * The shell redirects to /new-month once the budget month has turned, which is
 * every seeded login. Clearing it here rather than in each spec means a spec
 * only mentions the month-open screen when it is actually testing it.
 */
export async function clearNewMonthGate(page: Page): Promise<void> {
  // Home redirects here during its own render, so let the navigation settle
  // before deciding whether the gate is up.
  await page.waitForLoadState("domcontentloaded");
  if (!page.url().includes("/new-month")) return;
  await page.getByRole("button", { name: /^Start / }).click();
  await page.waitForURL((url) => !url.pathname.includes("/new-month"), { timeout: 30_000 });
}

/** Land on an app page past login/welcome/change-password gates. */
export async function enterAppAs(
  page: Page,
  email: string,
  password: string = E2E.password
): Promise<void> {
  await loginAs(page, email, password);

  if (page.url().includes("/change-password")) {
    throw new Error(
      `User ${email} is stuck on forced password change. Use a known password or complete the gate first.`
    );
  }

  if (page.url().includes("/pending-approval")) {
    throw new Error(`User ${email} is pending household approval.`);
  }

  await skipWelcomeIfPresent(page);
  await clearNewMonthGate(page);
}
