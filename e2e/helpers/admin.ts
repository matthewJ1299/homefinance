import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { E2E } from "./env";

export async function openAdminHouses(page: Page): Promise<void> {
  await page.goto("/admin/houses");
  await expect(page.getByRole("heading", { name: "Houses" })).toBeVisible();
}

export async function openHouseholdByName(page: Page, name: string): Promise<void> {
  await openAdminHouses(page);
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}

export async function openSeededHousehold(page: Page): Promise<void> {
  await openHouseholdByName(page, E2E.householdName);
}

export async function setHouseholdFeature(
  page: Page,
  featureKey: string,
  enabled: boolean
): Promise<void> {
  const checkbox = page.locator(`input[name="feature_${featureKey}"]`);
  await expect(checkbox).toBeVisible({ timeout: 15_000 });
  const isChecked = await checkbox.isChecked();
  if (isChecked !== enabled) {
    await checkbox.click();
  }
  await page.getByRole("button", { name: "Save entitlements" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

/** Turn every catalogue feature back on for the seeded household. */
/**
 * Ensure every entitlement is on, then return to the app.
 *
 * The gating spec turns features off and restores them best-effort; when that
 * restore fails, every later spec that needs an entitlement fails for a reason
 * that has nothing to do with what it was testing. Specs that depend on a
 * feature ask for it themselves rather than trusting the previous file.
 */
export async function ensureFeaturesEnabled(page: Page): Promise<void> {
  await enableAllSeededFeatures(page);
  await page.goto("/dashboard");
}

export async function enableAllSeededFeatures(page: Page): Promise<void> {
  await openSeededHousehold(page);
  const form = page.locator("form").filter({ hasText: "Feature entitlements" });
  const boxes = form.locator('input[type="checkbox"]');
  const count = await boxes.count();
  for (let i = 0; i < count; i++) {
    const box = boxes.nth(i);
    if (!(await box.isChecked())) {
      await box.click();
    }
  }
  await page.getByRole("button", { name: "Save entitlements" }).click();
}

export async function approvePendingHousehold(page: Page, householdName: string): Promise<void> {
  await openHouseholdByName(page, householdName);
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("This household is waiting for approval.")).toHaveCount(0, {
    timeout: 15_000,
  });
}

export async function rejectPendingHousehold(page: Page, householdName: string): Promise<void> {
  await openHouseholdByName(page, householdName);
  await page.getByRole("button", { name: "Reject" }).click();
  await expect(page.getByText("rejected").first()).toBeVisible({ timeout: 15_000 });
}

/** Create house + owner with a known password (still must_change_password on first login). */
export async function adminCreateHouseAndOwner(
  page: Page,
  input: {
    householdName: string;
    ownerName: string;
    ownerEmail: string;
    ownerPassword: string;
  }
): Promise<void> {
  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();

  const section = page.locator("section").filter({ hasText: "Create house + owner user" });
  await section.getByPlaceholder("Smith household").fill(input.householdName);
  await section.getByPlaceholder("Alex Smith").fill(input.ownerName);
  await section.getByPlaceholder("alex@example.com").fill(input.ownerEmail);
  await section.locator('input[name="ownerPassword"]').fill(input.ownerPassword);
  await section.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText(input.ownerEmail)).toBeVisible({ timeout: 20_000 });
}

export async function adminResetPasswordAndCapture(
  page: Page,
  userName: string
): Promise<string> {
  await page.goto("/admin/users");
  const row = page.locator("tr").filter({ hasText: userName }).first();
  await row.getByRole("button", { name: "Reset password" }).click();
  const confirm = page.locator("dialog[open]").filter({ hasText: /Reset password for/i });
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Reset password" }).click();
  const result = page.locator("dialog[open]").filter({ hasText: "Temporary password" });
  await expect(result).toBeVisible();
  const temp = (await result.locator(".font-mono").innerText()).trim();
  expect(temp.length).toBeGreaterThan(8);
  await result.getByRole("button", { name: "Close" }).click();
  return temp;
}
