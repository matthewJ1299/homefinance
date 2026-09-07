import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { loginAsMatt, clearNewMonthGate, skipWelcomeIfPresent } from "../helpers/auth";
import { E2E } from "../helpers/env";
import { clearNewMonthIfPresent, goNav } from "../helpers/nav";

/**
 * One sign-in, one browser, the whole app in order — for watching rather than
 * for CI.
 *
 * The suite proper registers households and resets passwords because that is
 * what it is testing; none of that is interesting to look at. This signs in
 * once as the seeded user and walks the flow a person actually walks, pausing
 * between screens so each one can be read.
 *
 *   npm run test:e2e:demo          # desktop
 *   npm run test:e2e:demo:mobile   # phone viewport, touch, mobile bottom bar
 *
 * The assertions are real: if a screen is broken this fails rather than
 * scrolling past it.
 */

/** Long enough to read the screen; override with E2E_DEMO_PAUSE. */
const PAUSE = Number(process.env.E2E_DEMO_PAUSE ?? 1_500);
const OTHER = E2E.sydneyName;

/** e2e/screenshots/<desktop|mobile>/NN-slug.png, numbered in flow order. */
let shot = 0;
function shotDir(): string {
  return path.join(process.cwd(), "e2e", "screenshots", test.info().project.name);
}

/**
 * A labelled beat: narrate it, hold long enough to read, and photograph it.
 *
 * The screenshot is the point as much as the pause -- one numbered image per
 * screen, in the order a person meets them, for both the phone and the desktop.
 * It is attached to the HTML report too, so `npm run test:e2e:report` is a
 * gallery rather than a list of green ticks.
 */
async function beat(page: import("@playwright/test").Page, what: string, slug?: string) {
  console.log(`   → ${what}`);
  await page.waitForTimeout(PAUSE);
  const name = `${String(++shot).padStart(2, "0")}-${slug ?? slugify(what)}.png`;
  const file = path.join(shotDir(), name);
  await page.screenshot({ path: file, fullPage: false });
  await test.info().attach(name, { path: file, contentType: "image/png" });
}

/** True when the run is the phone project, which is already the right size. */
function onPhone(): boolean {
  return test.info().project.name === "mobile";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

test.describe.configure({ mode: "serial" });

test("the whole flow, one sign-in", async ({ page }) => {
  test.setTimeout(10 * 60_000);
  const note = `demo-${Date.now()}`;
  // Start from an empty gallery so a shorter run cannot leave stale frames
  // behind and read as if they belong to it.
  fs.rmSync(shotDir(), { recursive: true, force: true });
  fs.mkdirSync(shotDir(), { recursive: true });

  await test.step("Sign in", async () => {
    await loginAsMatt(page);
    await skipWelcomeIfPresent(page);
    await clearNewMonthGate(page);
    await beat(page, "signed in as the seeded user — no registration, no reset");
  });

  await test.step("Home — what is left, and what needs you", async () => {
    await goNav(page, "Home");
    await clearNewMonthIfPresent(page);
    const main = page.getByRole("main");
    await expect(main.getByText("Left in your categories")).toBeVisible();
    await beat(page, "the envelope figure leads, not a donut");

    await main.getByRole("button", { name: "Breakdown" }).click();
    const breakdown = page.getByRole("dialog", { name: "Breakdown" });
    await expect(breakdown.getByText("Owed to you", { exact: true })).toBeVisible();
    await beat(page, "owed money sits below the line, so nothing is double-counted");
    await page.keyboard.press("Escape");

    await expect(main.getByText("Needs you")).toBeVisible();
    await beat(page, "one stream of rows, each with the action on it");
  });

  await test.step("Add a spend, and see what it does before saving", async () => {
    // The centre button is the mobile bar's, so the desktop run borrows a phone
    // viewport for the sheet. The phone run is already there -- resizing it
    // would hand the rest of the gallery back to the desktop layout.
    if (!onPhone()) await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
    await page.getByRole("button", { name: "Add a spend" }).click();

    const sheet = page.getByRole("dialog", { name: "Add" });
    await expect(sheet).toBeVisible();
    await beat(page, "the Add sheet — keypad first, because the amount is what you know");

    for (const key of "240.00") {
      await sheet.getByRole("button", { name: key, exact: true }).click();
    }
    await beat(page, "R240 typed");

    await sheet.getByRole("button", { name: /^Groceries/ }).first().click();
    await expect(sheet.getByText(/comes off Groceries/)).toBeVisible();
    await beat(page, "the consequence is on screen before the save, not in a toast after it");

    await sheet.getByRole("button", { name: OTHER, exact: true }).click();
    await expect(sheet.getByRole("button", { name: "Evenly" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await beat(page, `picking ${OTHER} splits it evenly — no dialog, no second decision`);

    await sheet.getByRole("button", { name: "By share" }).click();
    await sheet.getByLabel("You share of the split").fill("75");
    await sheet.getByLabel(`${OTHER} share of the split`).fill("25");
    await beat(page, "or by share: 75/25 of R240");

    await sheet.getByRole("button", { name: "Exact amounts" }).click();
    await beat(page, "or exact amounts, when the split is not a ratio at all");

    await sheet.getByRole("button", { name: "Evenly" }).click();
    await sheet.getByRole("button", { name: "+ Note" }).click();
    await sheet.getByLabel("Note").fill(note);
    await sheet.getByRole("button", { name: /^Save/ }).click();
    await expect(page.getByText(/Saved R/).first()).toBeVisible({ timeout: 20_000 });
    await beat(page, "saved — only your share hits your envelope");
    if (!onPhone()) await page.setViewportSize({ width: 1280, height: 800 });
  });

  await test.step("Transactions — money in and money out, one list", async () => {
    await goNav(page, "Transactions");
    await expect(page.getByText(note).first()).toBeVisible({ timeout: 20_000 });
    await beat(page, "your own rows only — no my/theirs/combined toggle to get wrong");
    await page.getByRole("button", { name: "Money in" }).click();
    await beat(page, "income is a filter here now, not a separate page");
  });

  await test.step("Shared costs — a balance per person", async () => {
    await goNav(page, "Shared costs");
    await expect(page.getByRole("heading", { name: "Shared costs" })).toBeVisible();
    await expect(page.getByText(/Owes you|You owe|Settled up/).first()).toBeVisible();
    await beat(page, "one card per person, netted — the row states your share, not the bill");
  });

  await test.step("Budget — read-only rows, edits in the sheet", async () => {
    await goNav(page, "Budget");
    await clearNewMonthIfPresent(page);
    await page.getByTestId("budget-category-row").filter({ hasText: "Groceries" }).first().click();
    const catSheet = page.getByRole("dialog", { name: "Groceries" });
    await expect(catSheet).toBeVisible();
    await beat(page, "every edit lives in one sheet, not an input on each of eleven rows");
    await expect(catSheet.getByRole("button", { name: "+R100" })).toBeVisible();
    await beat(page, "assign, empty it out, or set a target to make it a goal");
    await page.keyboard.press("Escape");
  });

  await test.step("Goals — a filtered view of Budget", async () => {
    await goNav(page, "Goals");
    await expect(page.getByRole("heading", { name: "Goals" })).toBeVisible();
    await beat(page, "a goal is a category with a target date — there is no second way to move money");
  });

  await test.step("Mortgage — what you own, and what the split costs", async () => {
    await goNav(page, "Mortgage");
    await expect(page.getByText("You own", { exact: true })).toBeVisible();
    await beat(page, "share of what is paid for so far, in a sentence");
  });

  await test.step("Reports, Calendar, Lists", async () => {
    await goNav(page, "Reports");
    await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
    await beat(page, "replaced Summary; the period runs from when you started");

    await goNav(page, "Calendar");
    await expect(page.getByText(/^Schedule for /)).toBeVisible();
    await beat(page, "the day view sits under the grid rather than on its own screen");

    await goNav(page, "Lists");
    await beat(page, "ticking anything offers to log the whole shop once");
  });

  await test.step("How this works", async () => {
    await page.goto("/how-this-works/rollover");
    await expect(
      page.getByRole("heading", { name: "What happens to money you don't spend" })
    ).toBeVisible();
    await beat(page, "the rollover rule, explained where the question comes up");
  });
});
