import { test, expect } from "../fixtures/test";
import { loginAs, loginAsMatt, signOut, skipWelcomeIfPresent } from "../helpers/auth";
import { approvePendingHousehold, openAdminHouses, rejectPendingHousehold } from "../helpers/admin";
import { E2E, uniqueEmail, uniqueName } from "../helpers/env";

test.describe.configure({ mode: "serial" });

test.describe("Registration + approval", () => {
  const householdName = uniqueName("Reg House");
  const ownerName = uniqueName("Reg Owner");
  const ownerEmail = uniqueEmail("reg");
  const password = "RegisterPass1!";

  test("self-register lands on pending-approval", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Create your household" })).toBeVisible();
    await page.getByLabel("Household name").fill(householdName);
    await page.getByLabel("Your name").fill(ownerName);
    await page.getByLabel("Email").fill(ownerEmail);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Register" }).click();
    await expect(page).toHaveURL(/\/pending-approval/, { timeout: 30_000 });
    await expect(
      page.getByRole("heading", { name: "Someone will approve your house shortly" })
    ).toBeVisible();
  });

  test("pending user cannot open dashboard", async ({ page }) => {
    await loginAs(page, ownerEmail, password);
    await expect(page).toHaveURL(/\/pending-approval/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/pending-approval/);
  });

  test("super-admin sees pending house and can approve", async ({ page }) => {
    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    await openAdminHouses(page);
    await expect(page.getByRole("link", { name: householdName })).toBeVisible();
    await approvePendingHousehold(page, householdName);
  });

  test("approved user can enter app (welcome or home)", async ({ page }) => {
    await loginAs(page, ownerEmail, password);
    await expect(page).not.toHaveURL(/\/pending-approval/);
    await expect(page).toHaveURL(/\/(welcome|dashboard)/);
  });
});

test.describe("Registration reject path", () => {
  const householdName = uniqueName("Reject House");
  const ownerEmail = uniqueEmail("reject");
  const password = "RejectPass12!";

  test("reject leaves household blocked", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Household name").fill(householdName);
    await page.getByLabel("Your name").fill(uniqueName("Reject Owner"));
    await page.getByLabel("Email").fill(ownerEmail);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Register" }).click();
    await expect(page).toHaveURL(/\/pending-approval/);
    await signOut(page);

    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    await rejectPendingHousehold(page, householdName);
    await signOut(page);

    await loginAs(page, ownerEmail, password);
    await expect(page).toHaveURL(/\/pending-approval/);
    await expect(page.getByRole("heading", { name: "Your house wasn't approved" })).toBeVisible();
  });
});
