import { test, expect } from "../fixtures/test";
import { loginAsMatt, skipWelcomeIfPresent } from "../helpers/auth";
import { addListItemOnFirstList, createCalendarEvent } from "../helpers/finance";
import { uniqueName } from "../helpers/env";
import { goNav } from "../helpers/nav";

test.describe.configure({ mode: "serial" });

test.describe("Lists + Calendar", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    await page.goto("/dashboard");
    await skipWelcomeIfPresent(page);
  });

  test("add item to an existing list", async ({ page }) => {
    const label = uniqueName("E2E Milk");
    await addListItemOnFirstList(page, label);
  });

  test("create list from Settings", async ({ page }) => {
    const name = uniqueName("E2E List");
    await goNav(page, "Settings");
    await page.locator("summary").filter({ hasText: /^Lists$/ }).click();
    const nameField = page.getByPlaceholder("e.g. Shopping");
    await expect(nameField).toBeVisible({ timeout: 15_000 });
    await nameField.fill(name);
    await page.getByRole("button", { name: "Add list" }).click();
    await expect(page.getByText("List created.").first()).toBeVisible({ timeout: 20_000 });
  });

  test("create a calendar event", async ({ page }) => {
    const name = uniqueName("E2E Event");
    await createCalendarEvent(page, name);
  });
});
