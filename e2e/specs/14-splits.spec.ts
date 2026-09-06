import { test, expect } from "../fixtures/test";
import {
  enterAppAs,
  loginAsMatt,
  signOut,
  skipWelcomeIfPresent,
} from "../helpers/auth";
import { E2E } from "../helpers/env";
import {
  addExpense,
  closeAddSheet,
  openAddSheet,
  settleFirstOwedBalance,
  typeAmountOnKeypad,
} from "../helpers/finance";
import { clearNewMonthIfPresent, goNav } from "../helpers/nav";

test.describe.configure({ mode: "serial" });

/** The seeded second member, as the avatar labels them. */
const OTHER = "Sydney";

test.describe("Shared costs", () => {
  const evenNote = `e2e-split-even-${Date.now()}`;
  const ratioNote = `e2e-split-ratio-${Date.now()}`;
  const exactNote = `e2e-split-exact-${Date.now()}`;

  test.beforeEach(async ({ page }) => {
    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    await page.goto("/dashboard");
    await skipWelcomeIfPresent(page);
    await clearNewMonthIfPresent(page);
  });

  test("splits evenly by default and shows it on Shared costs", async ({ page }) => {
    await addExpense(page, {
      amount: "200.00",
      categoryName: "Dining Out",
      note: evenNote,
      split: { withNames: [OTHER] },
    });

    await goNav(page, "Shared costs");
    await expect(page.getByRole("heading", { name: "Shared costs" })).toBeVisible();
    await expect(page.getByText(evenNote).first()).toBeVisible({ timeout: 20_000 });
    // Rows state the share, not the total.
    await expect(page.getByText(/your R\s?100,00/).first()).toBeVisible();
  });

  test("picking someone splits it in half without being asked", async ({ page }) => {
    await openAddSheet(page);
    const sheet = page.getByRole("dialog", { name: "Add" });

    await typeAmountOnKeypad(page, "70000");
    await sheet.getByRole("button", { name: /^Groceries/ }).first().click();
    await sheet.getByRole("button", { name: OTHER, exact: true }).click();

    // Even is the default, and it is genuinely half each.
    await expect(sheet.getByRole("button", { name: "Evenly" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await expect(sheet.getByText("50%").first()).toBeVisible();
    await expect(sheet.getByRole("button", { name: /your share R\s?350,00/ })).toBeVisible();

    await page.keyboard.press("Escape");
    await closeAddSheet(page);
  });

  test("by share: 80/20 of R700 comes out as R560 and R140", async ({ page }) => {
    await openAddSheet(page);
    const sheet = page.getByRole("dialog", { name: "Add" });

    await typeAmountOnKeypad(page, "70000");
    await sheet.getByRole("button", { name: /^Dining Out/ }).first().click();
    await sheet.getByRole("button", { name: OTHER, exact: true }).click();
    await sheet.getByRole("button", { name: "By share" }).click();

    await sheet.getByLabel("You share of the split").fill("80");
    await sheet.getByLabel(`${OTHER} share of the split`).fill("20");

    await expect(sheet.getByText(/R\s?560,00/).first()).toBeVisible();
    await expect(sheet.getByText(/R\s?140,00/).first()).toBeVisible();
    await expect(sheet.getByRole("button", { name: /your share R\s?560,00/ })).toBeEnabled();

    await sheet.getByRole("button", { name: "+ Note" }).click();
    await sheet.getByLabel("Note").fill(ratioNote);
    await sheet.getByRole("button", { name: /^Save/ }).click();
    await expect(page.getByText(/Saved R\s?560,00/).first()).toBeVisible({ timeout: 20_000 });
    await closeAddSheet(page);
  });

  test("exact amounts: typing one share leaves the rest to the other person", async ({ page }) => {
    await openAddSheet(page);
    const sheet = page.getByRole("dialog", { name: "Add" });

    await typeAmountOnKeypad(page, "70000");
    await sheet.getByRole("button", { name: /^Groceries/ }).first().click();
    await sheet.getByRole("button", { name: OTHER, exact: true }).click();
    await sheet.getByRole("button", { name: "Exact amounts" }).click();

    // Type only my share; theirs must follow to make up the bill.
    await sheet.getByLabel("You share", { exact: true }).fill("560.00");
    await expect(sheet.getByLabel(`${OTHER} share`, { exact: true })).toHaveValue("140.00");

    await sheet.getByRole("button", { name: "+ Note" }).click();
    await sheet.getByLabel("Note").fill(exactNote);
    await sheet.getByRole("button", { name: /^Save/ }).click();
    await expect(page.getByText(/Saved R\s?560,00/).first()).toBeVisible({ timeout: 20_000 });
    await closeAddSheet(page);
  });

  test("exact amounts that do not add up are refused, with the gap named", async ({ page }) => {
    await openAddSheet(page);
    const sheet = page.getByRole("dialog", { name: "Add" });

    await typeAmountOnKeypad(page, "70000");
    await sheet.getByRole("button", { name: /^Groceries/ }).first().click();
    await sheet.getByRole("button", { name: OTHER, exact: true }).click();
    await sheet.getByRole("button", { name: "Exact amounts" }).click();

    // 560 + 100 of a 700 bill: R40 short, and nothing should quietly cover it.
    await sheet.getByLabel("You share", { exact: true }).fill("560.00");
    await sheet.getByLabel(`${OTHER} share`, { exact: true }).fill("100.00");

    await expect(sheet.getByText(/R\s?40,00 still to account for/)).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Shares don't add up" })).toBeDisabled();

    await page.keyboard.press("Escape");
    await closeAddSheet(page);
  });

  test("changing who is in on it resets to an even split", async ({ page }) => {
    await openAddSheet(page);
    const sheet = page.getByRole("dialog", { name: "Add" });

    await typeAmountOnKeypad(page, "10000");
    await sheet.getByRole("button", { name: /^Groceries/ }).first().click();
    await sheet.getByRole("button", { name: OTHER, exact: true }).click();
    await sheet.getByRole("button", { name: "Exact amounts" }).click();
    await sheet.getByLabel("You share", { exact: true }).fill("90.00");

    // Dropping them and adding them back must not keep a division nobody chose.
    await sheet.getByRole("button", { name: OTHER, exact: true }).click();
    await sheet.getByRole("button", { name: OTHER, exact: true }).click();

    await expect(sheet.getByRole("button", { name: "Evenly" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await expect(sheet.getByRole("button", { name: /your share R\s?50,00/ })).toBeVisible();

    await page.keyboard.press("Escape");
    await closeAddSheet(page);
  });

  test("Shared costs leads with a balance per person", async ({ page }) => {
    await goNav(page, "Shared costs");
    await expect(page.getByText("Overall")).toBeVisible();
    await expect(page.getByText(new RegExp(`${OTHER}`)).first()).toBeVisible();
    await expect(page.getByText(/Owes you|You owe|Settled up/).first()).toBeVisible();
  });

  test("Sydney settles, and chooses where the money lands", async ({ page }) => {
    await enterAppAs(page, E2E.sydneyEmail);
    await page.goto("/dashboard");
    await skipWelcomeIfPresent(page);
    await clearNewMonthIfPresent(page);

    await goNav(page, "Shared costs");
    const settle = page.getByRole("button", { name: "Settle", exact: true }).first();
    if ((await settle.count()) > 0) {
      await settle.click();
      const sheet = page.getByRole("dialog", { name: /^Settle with/ });
      await expect(sheet).toBeVisible();
      // The sheet asks the one question the old dialog did not.
      await expect(sheet.getByText("Where should it land?")).toBeVisible();
      await expect(sheet.getByRole("button", { name: /^Settle into / })).toBeVisible();
      await sheet.getByRole("button", { name: /^Settle into / }).click();
      await expect(page.getByText(/Settled /).first()).toBeVisible({ timeout: 20_000 });
    } else {
      await expect(page.getByText(/Settled up|Nothing outstanding/).first()).toBeVisible();
    }
    await signOut(page);
  });

  test("a second settle run is still healthy", async ({ page }) => {
    await enterAppAs(page, E2E.sydneyEmail);
    await page.goto("/dashboard");
    await skipWelcomeIfPresent(page);
    await clearNewMonthIfPresent(page);
    await settleFirstOwedBalance(page);
    await goNav(page, "Shared costs");
    await expect(page.getByRole("heading", { name: "Shared costs" })).toBeVisible();
    await signOut(page);
  });
});
