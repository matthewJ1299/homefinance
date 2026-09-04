import { test, expect } from "../fixtures/test";
import { loginAsMatt, skipWelcomeIfPresent } from "../helpers/auth";
import { adminCreateHouseAndOwner, openAdminHouses, openSeededHousehold } from "../helpers/admin";
import { E2E, uniqueEmail, uniqueName } from "../helpers/env";

test.describe.configure({ mode: "serial" });

test.describe("Admin portal", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
  });

  test("Houses list shows seeded household with chips", async ({ page }) => {
    await openAdminHouses(page);
    await expect(page.getByRole("link", { name: E2E.householdName })).toBeVisible();
    await expect(page.getByText("Active").first()).toBeVisible();
  });

  test("Create house from Houses screen is active with core features", async ({ page }) => {
    const name = uniqueName("Admin Create");
    await openAdminHouses(page);
    const create = page.locator("section").filter({ hasText: "Create house" });
    await create.getByPlaceholder("Smith household").fill(name);
    await create.getByRole("button", { name: "Create" }).click();
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible({ timeout: 20_000 });
    await page.getByRole("link", { name, exact: true }).click();
    await expect(page.getByText(/active/i).first()).toBeVisible();
    // Core features: mortgage + goals
    await expect(
      page.locator("label").filter({ hasText: "Mortgage" }).locator('input[type="checkbox"]')
    ).toBeChecked();
    await expect(
      page.locator("label").filter({ hasText: "Goals" }).locator('input[type="checkbox"]')
    ).toBeChecked();
  });

  test("House detail can rename and edit entitlements", async ({ page }) => {
    await openSeededHousehold(page);
    const renamed = `${E2E.householdName}`;
    await page.locator('input[name="name"]').fill(renamed);
    await page.getByRole("button", { name: "Save name" }).click();
    await expect(page.getByRole("heading", { name: renamed })).toBeVisible();

    await page.getByRole("button", { name: "Save entitlements" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("Users: create house + owner, Features + Queries screens load", async ({ page }) => {
    const householdName = uniqueName("Users House");
    const ownerEmail = uniqueEmail("adminuser");
    await adminCreateHouseAndOwner(page, {
      householdName,
      ownerName: uniqueName("Admin Owner"),
      ownerEmail,
      ownerPassword: "AdminCreate1!",
    });
    await expect(page.getByText(ownerEmail)).toBeVisible();

    await page.goto("/admin/features");
    await expect(page.getByRole("heading", { name: /Features|Feature/i })).toBeVisible();
    await expect(page.getByText("AI budget analysis")).toBeVisible();

    await page.goto("/admin/queries");
    await expect(page.getByRole("heading", { name: "Queries" })).toBeVisible();
    await expect(page.getByText("Households")).toBeVisible();
    await expect(page.getByText("Users")).toBeVisible();
  });
});
