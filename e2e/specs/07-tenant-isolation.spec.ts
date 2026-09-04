import { test, expect } from "../fixtures/test";
import {
  enterAppAs,
  loginAs,
  loginAsMatt,
  signOut,
  skipWelcomeIfPresent,
} from "../helpers/auth";
import { adminCreateHouseAndOwner } from "../helpers/admin";
import { completeForcedPasswordChange } from "../helpers/nav";
import { uniqueEmail, uniqueName } from "../helpers/env";

test.describe.configure({ mode: "serial" });

test.describe("Tenant isolation", () => {
  const householdName = uniqueName("Iso House");
  const ownerName = uniqueName("Iso Owner");
  const ownerEmail = uniqueEmail("iso");
  const initialPassword = "IsoInitial1!";
  const password = "IsoOwnerPass1!";
  const secretNote = `iso-secret-${Date.now()}`;

  test("second household cannot see Matt household income markers, and vice versa", async ({
    page,
  }) => {
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
    await completeForcedPasswordChange(page, password);
    await skipWelcomeIfPresent(page);

    await page.goto("/income");
    await page.getByLabel("Amount (R)").fill("123.45");
    await page.getByLabel("Description (optional)").fill(secretNote);
    await page.getByRole("button", { name: "Add income" }).click();
    await expect(page.getByText(secretNote).first()).toBeVisible({ timeout: 20_000 });
    await signOut(page);

    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    await page.goto("/income");
    await expect(page.getByText(secretNote)).toHaveCount(0);
    await signOut(page);

    await enterAppAs(page, ownerEmail, password);
    await page.goto("/income");
    await expect(page.getByText(secretNote).first()).toBeVisible();
  });
});
