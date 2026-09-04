import { test, expect } from "../fixtures/test";
import { loginAs, loginAsMatt, signOut, skipWelcomeIfPresent } from "../helpers/auth";
import { approvePendingHousehold } from "../helpers/admin";
import { completeOnboarding } from "../helpers/onboarding";
import { uniqueEmail, uniqueName } from "../helpers/env";

test.describe.configure({ mode: "serial" });

test.describe("Onboarding /welcome", () => {
  const householdName = uniqueName("Onboard House");
  const ownerEmail = uniqueEmail("onboard");
  const password = "OnboardPass1!";

  test("fresh approved user is redirected to /welcome and can complete all steps", async ({
    page,
  }) => {
    await page.goto("/register");
    await page.getByLabel("Household name").fill(householdName);
    await page.getByLabel("Your name").fill(uniqueName("Onboard Owner"));
    await page.getByLabel("Email").fill(ownerEmail);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Register" }).click();
    await expect(page).toHaveURL(/\/pending-approval/);
    await signOut(page);

    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    await approvePendingHousehold(page, householdName);
    await signOut(page);

    await loginAs(page, ownerEmail, password);
    await expect(page).toHaveURL(/\/welcome/);
    await completeOnboarding(page);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("completed user is not forced back to welcome", async ({ page }) => {
    await loginAs(page, ownerEmail, password);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "Where does your money sit?" })).toHaveCount(0);
  });

  test("Settings can reopen the setup guide", async ({ page }) => {
    await loginAs(page, ownerEmail, password);
    await page.goto("/settings");
    await page.getByRole("link", { name: /Open setup guide|setup guide/i }).click();
    await expect(page).toHaveURL(/\/welcome/);
  });
});

test.describe("Onboarding skip + banner", () => {
  const householdName = uniqueName("Skip House");
  const ownerEmail = uniqueEmail("skip");
  const password = "SkipPass123!";

  test("Skip for now reaches dashboard with setup banner", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Household name").fill(householdName);
    await page.getByLabel("Your name").fill(uniqueName("Skip Owner"));
    await page.getByLabel("Email").fill(ownerEmail);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Register" }).click();
    await expect(page).toHaveURL(/\/pending-approval/);
    await signOut(page);

    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    await approvePendingHousehold(page, householdName);
    await signOut(page);

    await loginAs(page, ownerEmail, password);
    await expect(page).toHaveURL(/\/welcome/);
    await page.getByRole("button", { name: "Skip for now" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("Finish setting up your budget")).toBeVisible();
  });
});
