import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

const NAV_LABELS = [
  "Home",
  "Calendar",
  "Add",
  "Lists",
  "Transactions",
  "Income",
  "Recon",
  "Splits",
  "What I owe",
  "Budget",
  "Budget AI report",
  "Accounts",
  "Mortgage",
  "Goals",
  "Summary",
  "Settings",
] as const;

export type NavLabel = (typeof NAV_LABELS)[number];

/** Desktop sidebar / hamburger links. Prefer desktop viewport (config is 1280). */
export async function expectNavVisible(page: Page, label: NavLabel): Promise<void> {
  await expect(page.getByRole("link", { name: label, exact: true }).first()).toBeVisible();
}

export async function expectNavHidden(page: Page, label: NavLabel): Promise<void> {
  await expect(page.getByRole("link", { name: label, exact: true })).toHaveCount(0);
}

export async function goNav(page: Page, label: NavLabel): Promise<void> {
  await page.getByRole("link", { name: label, exact: true }).first().click();
}

export async function expectFeatureUnavailable(page: Page, featureKey: string): Promise<void> {
  const box = page.getByTestId("feature-unavailable");
  await expect(box).toBeVisible();
  await expect(box).toHaveAttribute("data-feature", featureKey);
}

/** Complete forced /change-password gate. */
export async function completeForcedPasswordChange(
  page: Page,
  newPassword: string
): Promise<void> {
  await expect(page).toHaveURL(/\/change-password/);
  await page.locator("#newPassword").fill(newPassword);
  await page.locator("#confirmPassword").fill(newPassword);
  await page.getByRole("button", { name: "Save password" }).click();
  await page.waitForURL((url) => !url.pathname.includes("/change-password"), { timeout: 30_000 });
}
