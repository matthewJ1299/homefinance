import { test, expect } from "../fixtures/test";
import { loginAsMatt, skipWelcomeIfPresent, waitForStableUrl } from "../helpers/auth";
import { addExpense, checkAccountBalance } from "../helpers/finance";
import { clearNewMonthIfPresent, goNav } from "../helpers/nav";

test.describe.configure({ mode: "serial" });

/**
 * The surfaces the UX pass introduced, which nothing else covers: the month-end
 * receipt, the balance check, the shop-logging seam, event costs, and the rules
 * that make the bank inbox worth having.
 */
test.describe("Redesign flows", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    await page.goto("/dashboard");
    await skipWelcomeIfPresent(page);
  });

  test("/new-month is a receipt, not a question, and Skip still opens the month", async ({
    page,
  }) => {
    await page.goto("/new-month");
    // The page redirects home when there is nothing to open, so let that land
    // before deciding which case we are in.
    await waitForStableUrl(page);

    // Either the month has already been opened -- in which case the page sends
    // you home rather than asking again -- or it states what happened. Decide on
    // what is on screen, not on a URL that can still be mid-redirect.
    const heading = page.getByRole("heading", { name: "New month" });
    if (await heading.isVisible().catch(() => false)) {
      await expect(heading).toBeVisible();
      await expect(page.getByText(/is done$/)).toBeVisible();
      await expect(page.getByRole("button", { name: /^Start / })).toBeVisible();
      // No "is it a new month?" prompt: the month has already turned.
      await expect(page.getByText(/Is it a new month/i)).toHaveCount(0);
      await page.getByRole("button", { name: "Skip" }).click();
    }
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

    // Idempotent: opening it twice must not offer the same month again.
    await page.goto("/new-month");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  });

  test("the balance check records the gap as one visible line", async ({ page }) => {
    await clearNewMonthIfPresent(page);
    await goNav(page, "Accounts");

    const check = page.getByRole("button", { name: "Check", exact: true }).first();
    await expect(check).toBeVisible();
    await check.click();

    const sheet = page.getByRole("dialog", { name: /^Check / });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText("HomeFinance thinks")).toBeVisible();
    await expect(sheet.getByText("Your bank says")).toBeVisible();
    await expect(sheet.getByText("Difference")).toBeVisible();
    // Two explicit buttons rather than a silent correction.
    await expect(sheet.getByRole("button", { name: /Let me look for it first/ })).toBeVisible();

    await sheet.getByLabel("Your bank says").fill("1234.00");
    await expect(sheet.getByText(/record it as one .* line called Unaccounted/)).toBeVisible();
    await sheet.getByRole("button", { name: /Let me look for it first/ }).click();
    await expect(sheet).toBeHidden();
  });

  test("accepting a balance gap writes an Unaccounted transaction", async ({ page }) => {
    await clearNewMonthIfPresent(page);
    await checkAccountBalance(page, "999.00");

    await goNav(page, "Transactions");
    await expect(page.getByText("Balance check").first()).toBeVisible({ timeout: 20_000 });
  });

  test("a shop is logged once, not once per item", async ({ page }) => {
    await clearNewMonthIfPresent(page);
    await goNav(page, "Lists");
    await page.getByRole("link", { name: "Open" }).first().click();

    const label = `e2e-shop-${Date.now()}`;
    await page.getByLabel("Label").fill(label);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText(label).first()).toBeVisible();

    // Ticking anything is what offers the card -- once, for the whole shop.
    const tick = page.getByRole("checkbox").first();
    if ((await tick.count()) > 0) {
      await tick.check();
      await expect(page.getByText("Done shopping?")).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole("button", { name: "Log the shop" })).toBeVisible();
    }
  });

  test("the calendar answers whose, and offers to log an event's cost", async ({ page }) => {
    await clearNewMonthIfPresent(page);
    await goNav(page, "Calendar");
    await expect(page).toHaveURL(/\/calendar/);

    // A day view under the grid rather than a separate screen.
    await expect(page.getByText(/^Schedule for /)).toBeVisible();

    // The person filter is the primary one when more than one person has events.
    const everyone = page.getByRole("button", { name: "Everyone" });
    if ((await everyone.count()) > 0) {
      await expect(everyone).toHaveAttribute("aria-pressed", "true");
    }
  });

  test("the bank inbox groups what its rules already decided", async ({ page }) => {
    await clearNewMonthIfPresent(page);
    await page.goto("/recon");

    if ((await page.getByTestId("feature-unavailable").count()) > 0) {
      test.skip(true, "Recon not entitled for this household");
    }

    await expect(page.getByRole("heading", { name: "From your bank" })).toBeVisible();
    // Stated on screen, not assumed.
    await expect(page.getByText(/Only your mailbox is read/)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Your rules/ })).toBeVisible();
  });

  test("rollover is explained where the question comes up", async ({ page }) => {
    await page.goto("/how-this-works/rollover");
    await expect(
      page.getByRole("heading", { name: "What happens to money you don't spend" })
    ).toBeVisible();
    await expect(page.getByText("Leftovers stay in the category")).toBeVisible();
    await expect(page.getByText("Overspends don't follow the category")).toBeVisible();

    await page.goto("/how-this-works/equity");
    await expect(
      page.getByRole("heading", { name: "How your share of the house works" })
    ).toBeVisible();
  });

  test("an overspend turns into a row that offers to cover it", async ({ page }) => {
    await clearNewMonthIfPresent(page);
    // Big enough to put a category over whatever it was assigned, and no bigger:
    // the keypad reads rands, so the old "9999900" spent ten million a run and
    // drained the seeded account the transfer spec needs.
    await addExpense(page, {
      amount: "5000.00",
      categoryName: "Dining Out",
      note: `e2e-over-${Date.now()}`,
    });

    await goNav(page, "Home");
    await clearNewMonthIfPresent(page);
    await expect(page.getByText(/Dining Out is .* over/)).toBeVisible({ timeout: 20_000 });
    const cover = page.getByRole("link", { name: "Cover it" }).first();
    await expect(cover).toBeVisible();
    await cover.click();
    // The row hands you straight to the category it is about.
    await expect(page).toHaveURL(/\/budget\?cover=\d+/);
  });
});
