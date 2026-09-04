import { test, expect } from "../fixtures/test";
import { enterAppAs, loginAs, loginAsMatt, signOut, skipWelcomeIfPresent } from "../helpers/auth";
import { adminCreateHouseAndOwner, adminResetPasswordAndCapture } from "../helpers/admin";
import { completeForcedPasswordChange } from "../helpers/nav";
import { E2E, uniqueEmail, uniqueName } from "../helpers/env";

test.describe.configure({ mode: "serial" });

test.describe("Password management", () => {
  const householdName = uniqueName("Pw House");
  const ownerName = uniqueName("Pw Owner");
  const ownerEmail = uniqueEmail("pw");
  const initialPassword = "InitialPass1!";
  const afterForcePassword = "ForcedPass12!";
  const afterVoluntaryPassword = "Voluntary9!";

  test("admin-created user is forced to change password", async ({ page }) => {
    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    await adminCreateHouseAndOwner(page, {
      householdName,
      ownerName,
      ownerEmail,
      ownerPassword: initialPassword,
    });
    await signOut(page);

    await loginAs(page, ownerEmail, initialPassword);
    await completeForcedPasswordChange(page, afterForcePassword);
    await skipWelcomeIfPresent(page);
    await expect(page).toHaveURL(/\/(dashboard|welcome)/);
  });

  test("admin reset password re-triggers forced change", async ({ page }) => {
    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    const temp = await adminResetPasswordAndCapture(page, ownerName);
    await signOut(page);

    await loginAs(page, ownerEmail, temp);
    await completeForcedPasswordChange(page, afterForcePassword);
    await skipWelcomeIfPresent(page);
  });

  test("Settings voluntary change password", async ({ page }) => {
    await enterAppAs(page, ownerEmail, afterForcePassword);
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    await page.getByLabel("Current password").fill(afterForcePassword);
    await page.getByLabel("New password").fill(afterVoluntaryPassword);
    await page.getByLabel("Confirm new password").fill(afterVoluntaryPassword);
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page.getByText(/Password updated|incorrect/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Password updated.")).toBeVisible();

    // Wrong current password fails
    await page.getByLabel("Current password").fill("wrong-password-xx");
    await page.getByLabel("New password").fill("AnotherPass1!");
    await page.getByLabel("Confirm new password").fill("AnotherPass1!");
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page.getByText(/incorrect/i).first()).toBeVisible();
  });
});
