import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Sidebar labels after the UX pass. Income folded into Transactions, Splits
 * became "Shared costs", Recon became "From your bank", Summary became
 * "Reports".
 */
const NAV_LABELS = [
  "Home",
  "Calendar",
  "Add",
  "Lists",
  "Transactions",
  "From your bank",
  "Shared costs",
  "What I owe",
  "Budget",
  "Budget AI report",
  "Accounts",
  "Mortgage",
  "Goals",
  "Reports",
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

/**
 * Click a nav link and wait until the URL is actually the link's own href.
 *
 * `networkidle` is the wrong wait here twice over: a client-side navigation
 * fires no load event, so it can return while still on the page you came from,
 * and any page that polls never goes idle at all. Waiting on the href also
 * survives a click that lands while the page is still settling -- it retries
 * once rather than leaving the spec to fail on a screen it never left.
 */
export async function goNav(page: Page, label: NavLabel): Promise<void> {
  // Below the desktop breakpoint the sidebar is gone and the same links live
  // behind "Open menu", so a phone run opens it first -- and then looks inside
  // it, because the header's own "Home" link sits behind the menu's scrim and
  // cannot be clicked while it is up.
  const openMenu = page.getByRole("button", { name: "Open menu" });
  const onPhone = await openMenu.isVisible().catch(() => false);
  if (onPhone) await openMenu.click();
  const scope = onPhone ? page.getByRole("dialog", { name: "Navigation menu" }) : page;

  const link = scope.getByRole("link", { name: label, exact: true }).first();
  await expect(link).toBeVisible();
  const href = (await link.getAttribute("href")) ?? "";
  // The month-open gate can bounce you off whatever you asked for, and that is
  // an arrival too -- callers clear it with clearNewMonthIfPresent.
  const arrived = () =>
    page.waitForURL(
      (url) =>
        url.pathname === href ||
        url.pathname.startsWith(`${href}/`) ||
        url.pathname === "/new-month" ||
        url.pathname === "/welcome",
      { timeout: 15_000, waitUntil: "commit" }
    );

  await link.click();
  try {
    await arrived();
  } catch {
    await link.click();
    await arrived();
  }
  await page.waitForLoadState("domcontentloaded");
  // Best effort: give the page a moment to render before a caller counts
  // elements, but never fail here -- pages that poll never go idle.
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
}

/**
 * The budget month turns over into a gate that redirects off whatever you asked
 * for, so any spec that lands in the app has to be able to clear it.
 */
export async function clearNewMonthIfPresent(page: Page): Promise<void> {
  if (!page.url().includes("/new-month")) return;
  await page.getByRole("button", { name: /^Start / }).click();
  await page.waitForURL((url) => !url.pathname.includes("/new-month"), { timeout: 30_000 });
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
