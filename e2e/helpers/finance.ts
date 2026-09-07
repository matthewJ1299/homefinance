import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { clearNewMonthGate, skipWelcomeIfPresent, waitForStableUrl } from "./auth";
import { clearNewMonthIfPresent, goNav } from "./nav";

export async function expectToast(page: Page, text: string | RegExp): Promise<void> {
  await expect(page.getByText(text).first()).toBeVisible({ timeout: 20_000 });
}

/** The bottom bar's centre button is mobile-only; the sheet is opened from it. */
const ADD_BUTTON = { name: "Add a spend" } as const;

/**
 * Opens the Add sheet.
 *
 * The centre button lives in the mobile bar, so the suite drops to a phone
 * viewport for the sheet and restores the desktop width afterwards. That is
 * also the viewport the sheet is designed for.
 */
export async function openAddSheet(page: Page): Promise<void> {
  // The shell only loads the sheet's data on app pages, so /welcome and the
  // other bypass paths render the centre button as a plain link to /add. Land
  // on Home first rather than depending on where the caller happened to be.
  if (!page.url().includes("/dashboard")) {
    await page.goto("/dashboard");
  }
  await waitForStableUrl(page);
  // Home sends a user who has not finished setup to /welcome, where the shell
  // has no Add sheet -- so clear that gate here, as the month gate already is.
  await skipWelcomeIfPresent(page);
  await clearNewMonthGate(page);
  await page.setViewportSize({ width: 390, height: 844 });
  // Home refreshes itself after the month gate; opening the sheet into that
  // detaches the keypad mid-click. Let it settle first -- best effort, since a
  // page that polls never goes idle.
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
  await page.getByRole("button", ADD_BUTTON).click();
  const dialog = page.getByRole("dialog", { name: "Add" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "1", exact: true })).toBeVisible();
}

export async function closeAddSheet(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 800 });
}

function sheet(page: Page) {
  return page.getByRole("dialog", { name: "Add" });
}

/** Types an amount on the keypad, digit by digit, as a person would. */
export async function typeAmountOnKeypad(page: Page, amount: string): Promise<void> {
  const dialog = sheet(page);
  for (const ch of amount) {
    const key = dialog.getByRole("button", { name: ch, exact: true });
    // A background refresh can replace the sheet between keys; one retry is
    // enough, and it keeps the failure about the amount rather than the timing.
    try {
      await key.click({ timeout: 10_000 });
    } catch {
      await expect(dialog).toBeVisible();
      await key.click({ timeout: 10_000 });
    }
  }
}

export interface SplitSpec {
  /** Who else is in on it, by first name as the avatar shows it. */
  withNames: string[];
  mode?: "even" | "ratio" | "exact";
  /** ratio mode: weight per person, keyed by the label on the field. */
  ratios?: Record<string, string>;
  /** exact mode: rand amount per person, keyed by the label on the field. */
  amounts?: Record<string, string>;
}

/**
 * Adds a spend through the Add sheet: keypad, category pill, and optionally
 * who is in on it and how it divides.
 */
export async function addExpense(
  page: Page,
  input: {
    amount: string;
    categoryName?: string;
    note?: string;
    split?: SplitSpec;
  }
): Promise<void> {
  await openAddSheet(page);
  const dialog = sheet(page);

  await typeAmountOnKeypad(page, input.amount);

  const category = input.categoryName ?? "Groceries";
  await dialog.getByRole("button", { name: new RegExp(`^${escapeRegex(category)}`) }).first().click();

  if (input.split) {
    for (const name of input.split.withNames) {
      await dialog.getByRole("button", { name, exact: true }).click();
    }
    const mode = input.split.mode ?? "even";
    if (mode !== "even") {
      await dialog
        .getByRole("button", { name: mode === "ratio" ? "By share" : "Exact amounts" })
        .click();
    }
    if (mode === "ratio" && input.split.ratios) {
      for (const [who, weight] of Object.entries(input.split.ratios)) {
        await dialog.getByLabel(`${who} share of the split`).fill(weight);
      }
    }
    if (mode === "exact" && input.split.amounts) {
      for (const [who, value] of Object.entries(input.split.amounts)) {
        await dialog.getByLabel(`${who} share`, { exact: true }).fill(value);
      }
    }
  }

  if (input.note) {
    await dialog.getByRole("button", { name: "+ Note" }).click();
    await dialog.getByLabel("Note").fill(input.note);
  }

  await dialog.getByRole("button", { name: /^Save/ }).click();
  await expectToast(page, /Saved /);
  await closeAddSheet(page);
}

/** Reads the per-person share the sheet is currently showing. */
export async function readShare(page: Page, who: string): Promise<string> {
  const dialog = sheet(page);
  const exact = dialog.getByLabel(`${who} share`, { exact: true });
  if ((await exact.count()) > 0) return (await exact.inputValue()).trim();
  // Even and ratio modes render the figure as text beside the name.
  const row = dialog.locator("div").filter({ hasText: new RegExp(`^${escapeRegex(who)}`) }).last();
  return (await row.innerText()).trim();
}

export async function addIncome(
  page: Page,
  input: { amount: string; description: string; kind?: string }
): Promise<void> {
  await openAddSheet(page);
  const dialog = sheet(page);
  await dialog.getByRole("tab", { name: "income" }).click();
  await typeAmountOnKeypad(page, input.amount);
  if (input.kind) {
    await dialog.getByRole("button", { name: input.kind, exact: true }).click();
  }
  await dialog.getByRole("button", { name: "+ Note" }).click();
  await dialog.getByLabel("Note").fill(input.description);
  await dialog.getByRole("button", { name: /^Save .* in$/ }).click();
  await expectToast(page, /Added /);
  await closeAddSheet(page);
}

export async function createAccount(
  page: Page,
  input: { name: string; type?: "Bank" | "Savings" | "Credit"; shared?: boolean }
): Promise<void> {
  await goNav(page, "Accounts");
  await page.getByRole("button", { name: "Add account" }).click();
  await page.getByLabel("Account name").fill(input.name);
  if (input.type && input.type !== "Bank") {
    await page.getByLabel("Type").selectOption({ label: input.type });
  }
  if (input.shared) {
    const share = page.getByRole("switch", { name: "Share with the house" });
    if ((await share.count()) > 0) await share.click();
  }
  await page.getByRole("button", { name: "Add account" }).click();
  await expectToast(page, "Account created.");
  await expect(page.getByText(input.name).first()).toBeVisible();
}

/** Accepts the gap between what the app thinks an account holds and the bank. */
export async function checkAccountBalance(page: Page, statedBalance: string): Promise<void> {
  await goNav(page, "Accounts");
  await page.getByRole("button", { name: "Check", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: /^Check / });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Your bank says").fill(statedBalance);
  await dialog.getByRole("button", { name: /^Accept/ }).click();
  await expectToast(page, /Recorded|Already matches/);
}

/** Transfer between first two real account options (seeded Matt has ≥2). */
export async function transferBetweenAccounts(
  page: Page,
  input: { amount: string; note: string }
): Promise<void> {
  await goNav(page, "Accounts");
  await page.getByRole("button", { name: "Transfer Money" }).click();
  const dialog = page.locator("dialog[open]").filter({ hasText: "Transfer Money" });
  await expect(dialog).toBeVisible();

  // Out of savings and into the everyday account, not the other way round: the
  // everyday account is where every seeded and e2e expense lands, so it can be
  // overdrawn by the time this runs and the transfer is refused.
  await dialog.locator("#transfer-from").selectOption({ index: 2 });
  await dialog.locator("#transfer-to").selectOption({ index: 1 });
  await dialog.locator("#transfer-amount").fill(input.amount);
  await dialog.locator("#transfer-note").fill(input.note);
  await dialog.getByRole("button", { name: "Transfer", exact: true }).click();
  await expect(dialog).toHaveCount(0, { timeout: 20_000 });
}

/**
 * Opens every closed "More details" disclosure on the page.
 *
 * The Mortgage page has two -- the page-level section and the one inside the
 * details card -- so opening only the first one left the rate-changes section
 * still hidden inside the other.
 */
export async function expandMoreDetails(page: Page): Promise<void> {
  const summaries = page.locator("summary").filter({ hasText: /More details/i });
  // The page may still be rendering: counting straight away found none and
  // returned, leaving everything collapsed.
  await summaries.first().waitFor({ state: "attached", timeout: 10_000 }).catch(() => {});
  for (let i = 0; i < (await summaries.count()); i++) {
    const summary = summaries.nth(i);
    const open = await summary.evaluate((el) => el.closest("details")?.open === true);
    if (!open) await summary.click();
  }

  // The Mortgage page nests a second "More details" inside the first, and that
  // one is a button with aria-expanded rather than a <details>. Opening only
  // the outer disclosure leaves the amortisation table and the setup form
  // hidden inside it.
  const toggles = page.getByRole("button", { name: /^More details$/i });
  for (let i = 0; i < (await toggles.count()); i++) {
    const toggle = toggles.nth(i);
    if ((await toggle.getAttribute("aria-expanded")) === "false") await toggle.click();
  }
}

export async function recordMortgageExtraPayment(
  page: Page,
  input: { amount: string; note: string }
): Promise<void> {
  await goNav(page, "Mortgage");
  await expect(page.getByTestId("feature-unavailable")).toHaveCount(0);
  // Amortisation and extra payments moved behind More details, which is a
  // <details>/<summary>, not a button.
  await expandMoreDetails(page);
  const form = page.getByTestId("mortgage-extra-payment");
  await form.getByLabel("Amount (R)").fill(input.amount);
  await form.getByLabel("Note (optional)").fill(input.note);
  await form.getByRole("button", { name: "Record extra payment" }).click();
  await expectToast(page, "Extra payment recorded.");
}

/**
 * A goal is a category with a target now, so this sets one from the budget
 * category sheet rather than from a separate Goals form.
 */
export async function createGoalCategory(
  page: Page,
  input: { categoryName: string; target: string; targetDate?: string }
): Promise<void> {
  await goNav(page, "Budget");
  await clearNewMonthIfPresent(page);
  await page
    .getByTestId("budget-category-row")
    .filter({ hasText: input.categoryName })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: input.categoryName });
  await expect(dialog).toBeVisible();
  // Only offered while the category has no target yet; re-running the spec finds
  // the editor already open.
  const startSaving = dialog.getByRole("button", { name: "Save towards something" });
  if (await startSaving.isVisible().catch(() => false)) await startSaving.click();
  await dialog.getByLabel("Target amount").fill(input.target);
  if (input.targetDate) {
    await dialog.getByLabel("Target date").fill(input.targetDate);
  }
  await dialog.getByRole("button", { name: "Save target" }).click();
  await expectToast(page, /saving towards/i);
  // Setting a target leaves the sheet open so you can assign to it; close it
  // before the caller navigates.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
}

export async function settleFirstOwedBalance(page: Page): Promise<boolean> {
  await goNav(page, "Shared costs");
  // count() does not wait, so let the page render before asking.
  await expect(page.getByRole("heading", { name: "Shared costs" })).toBeVisible();
  const settle = page.getByRole("button", { name: "Settle", exact: true }).first();
  if ((await settle.count()) === 0) return false;
  await settle.click();
  const dialog = page.getByRole("dialog", { name: /^Settle with/ });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /^Settle/ }).click();
  await expectToast(page, /Settled /);
  return true;
}

export async function addListItemOnFirstList(page: Page, label: string): Promise<void> {
  await goNav(page, "Lists");
  await page.getByRole("link", { name: "Open" }).first().click();
  await page.getByLabel("Label").fill(label);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expectToast(page, "Item added.");
  await expect(page.getByText(label).first()).toBeVisible();
}

export async function createCalendarEvent(page: Page, name: string): Promise<void> {
  await goNav(page, "Calendar");
  await page.getByRole("button", { name: "Add event" }).click();
  const dialog = page.locator("dialog[open]").filter({ hasText: "New event" });
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder("Event name").fill(name);
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog).toHaveCount(0, { timeout: 20_000 });
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 20_000 });
}

/** Reports replaced Summary. */
export async function expectReportsLoaded(page: Page): Promise<void> {
  await goNav(page, "Reports");
  await clearNewMonthIfPresent(page);
  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Overview" }).or(page.getByText("Nothing to report yet"))
  ).toBeVisible();
}

export async function expectBudgetLoaded(page: Page): Promise<void> {
  await goNav(page, "Budget");
  await clearNewMonthIfPresent(page);
  await expect(page.getByRole("heading", { name: "Budget" })).toBeVisible();
  await expect(
    page.getByText(/Not given a job yet|Every rand has a job|promised more than you have/i).first()
  ).toBeVisible();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
