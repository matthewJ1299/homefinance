# Home Finance

Personal finance app for tracking income, expenses, and budgets.

## Features

- **Income**: Record salary and ad-hoc income per month. **Dashboard income** shows only the signed-in user's income for the selected month.
- **Expenses**: Log expenses by category with optional notes.
  - **Dashboard**: The "Recent" expenses section shows only the signed-in user's expenses. A **Today's events** tile shows any calendar events for the current day (with time if set) and links to the Calendar page; if there are none, it shows "No events today".
  - **Expenses page**: Toggle to view **My expenses**, another user's expenses (e.g. partner's), or **Combined** income and expenses for the selected view. Income and expense totals are shown for the active filter.
- **Categories**: Each category is either **Fixed** or **Variable** cost.
  - **Fixed**: Same amount each month (e.g. Utilities, Insurance). You can set a default amount (R) in Manage categories; that amount is auto-allocated for new months until you change it.
  - **Variable**: Amount varies by month (e.g. Groceries, Dining out).
- **Budget**: **Per-user**: each signed-in user has their own budget. You see only your income, your expenses, your category allocations, and your transfers. Allocate income to categories per month. Category order can be changed by **drag and drop** (grip handle on the left of each category card); the order is saved and used app-wide (e.g. Manage categories, category pickers). Allocations **carry over**: if a month has no allocation set for a category, the last set allocation from a previous month is used. So you only need to change an allocation when you want it to differ from the previous month.
  - When there is unallocated income, use **Auto-allocate** to distribute the remainder:
    - If you have already set amounts for some categories, the remainder is added to those categories only.
    - If historical expense data exists (past 6 months), the remainder is split in proportion to past spending.
    - If there is no history or no allocations yet, the remainder is split evenly across categories.
  - Opening the budget for a new month automatically fills in carried-over allocations and, for fixed-cost categories with a default amount, that default.
- **Transfers**: Move budget between categories within a month.
- **Splits**: Track shared expenses and who owes whom. **Split groups** (e.g. Home, Wedding) let you keep balances separate: create groups under **Split groups**, then when adding a split expense choose a group (defaults to "Default"). On the **Splits** page you see a summary tile per group and can switch the active group to see "How much each person owes" and **Split history** for that group only. Settling is per group: use **Settle** and the amount is applied to the current group's balance. You can also settle from the dashboard by adding an expense with category **Splits** (applies to the default group).
- **Summary**: Per-user monthly snapshot (your income, expenses, and budget adherence) and household trends.
- **Quick-add FAB**: On every app screen, a floating **+** button at the bottom-left opens a menu: **Expense**, **List item**, or **Calendar event**. Select one to open the corresponding modal and add an expense (with category and optional split), a list item (choose list, label, quantity), or a calendar event. Saves and refreshes the relevant data.
- **Calendar**: Shared household calendar. Both users see the same events and can create, edit, and delete any event. Events have name, location, date, time, notes, and who created them. Recurrence can be none, weekly, monthly (with optional day of month), or yearly. Full CRUD via the calendar page (month/week/day views).
- **Shared lists**: Household-wide lists (e.g. shopping, chores). **Lists** in the nav opens the default list (first by sort order); if there are no lists, you see a prompt to add one in Settings. Create and delete lists under **Settings** > **Shared lists**. On a list’s page, use the list switcher to jump to another list. Add items with label and quantity; use plus/minus to change quantity. Click an item to mark it complete (strikethrough, moves to bottom). Delete individual items or "Delete all completed" for a list. Both users have full access.
- **Mortgage**: Optional mortgage tracking. The page uses plain-language labels and a single at-a-glance summary (what you still owe - balance after last payment - total per month, when you will be done paying, each person’s share of the home). The amortisation table and form to change the loan or who pays what are in a collapsible **More details** section below.
  - **Past vs future**: Months in which you have recorded payments show **actual** amounts paid (e.g. 10k one month, 5k another). When you change the interest rate or payment (config or user shares), only **future** months are recalculated; past months stay as paid. The projection runs from the current remaining balance, so payoff date and equity reflect the new rate and payment from “today” onward.

- **Recurring income and expenses**: Under **Recurring income** and **Recurring expenses** you define templates (amount, category for expenses, day of month). Each month, use **Populate this month** on the dashboard to create actual income and expense rows from those templates. Population is idempotent: it only creates entries that do not already exist for that month, so you can run it again safely.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and set `AUTH_SECRET`. Optionally set:
   - **Postgres**: `DATABASE_URL=postgresql://user:password@host:5432/dbname` (when set, the app uses Postgres instead of SQLite).
   - **Push notifications**: `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` (run `npm run generate-vapid-keys` and add the output to `.env.local`; required for enabling push in the app).
   - **SQLite**: `DB_PATH` (default `./data/sqlite.db`).
   - **Seed**: `SEED_USER1_EMAIL`, `SEED_USER2_EMAIL`, `SEED_USER_PASSWORD`, etc. (see `.env.example`).
3. Create the database and seed: `npm run db:fresh` (recreates the DB from scratch, then seeds), or:
   - Reset and create tables: `npm run db:reset` (drops/recreates DB, runs schema push, then seeds minimal categories and users).
   - Seed: `npm run db:seed` (clears all data, then inserts users, categories, 3 months of income/expenses, and sample split expenses).

**Local Postgres with Docker:** Run `docker compose up --build`, then in the app container run push and seed (see [DEPLOY.md](./DEPLOY.md)).

## Seed data

Seed always creates:

- Two users (see `.env.example` for `SEED_USER1_EMAIL`, `SEED_USER2_EMAIL`, etc.).
- Default categories (fixed/variable and default amounts where applicable).
- **3 months** of income and expenses for **both users**: current month and the two previous months. Income includes monthly salary per user plus ad-hoc entries; expenses are spread across categories and both users.
- **Per-user budget allocations** for the same 3 months: each user gets allocation rows for the main categories (groceries, transport, utilities, savings, etc.) and one sample **budget transfer** (savings to groceries) so the Budget page shows meaningful data for each user.
- **Split expenses** (current month): e.g. groceries split equally, dinner split equally, and a full-amount-owed utility expense, so the Splits page shows who owes whom. A **Splits** category is included for settlement expenses.

Amounts use the same integer format as the app (e.g. cents). To start with an empty transaction history, you would need to change the seed script or clear income/expenses after seeding.

## PWA (install as app)

HomeFinance can be installed as a Progressive Web App (PWA) on phones and desktops for home-screen access and optional offline use.

- **Manifest and service worker**: The app uses Next.js `manifest.ts` and [Serwist](https://serwist.pages.dev/) for the service worker (precache, runtime cache, offline fallback). In development the service worker is disabled; use a production build to test install.
- **Icons**: PWA icons live in `public/icons/`. Generate placeholder icons with:
  ```bash
  npm run generate-pwa-icons
  ```
  To use your own icon, replace `icon-192x192.png`, `icon-512x512.png`, and `icon-maskable-512x512.png` (see `public/icons/README.md`). Maskable icons should keep important content in the center 80%.
- **Install prompt**: When the app meets install criteria (HTTPS, valid manifest, service worker, icons), supported browsers may show a custom "Install" banner (once per device until dismissed). The app also detects standalone mode and hides the prompt when already installed. **On iOS** (iPhone/iPad), Safari does not support the standard install prompt; the app shows instructions to add via Share > Add to Home Screen. An apple-touch-icon is set so the home screen icon appears correctly.
- **Push notifications**: The app can send Web Push notifications (e.g. reminders, alerts) when the PWA is in the background or closed. In **Settings**, use the "Push notifications" section to enable (browser will ask for permission), send a test, or disable. The service worker handles incoming push and notification clicks (opens the app or a URL). To enable push in production, set VAPID keys: run `npm run generate-vapid-keys` and add `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` to your environment. Without these, the "Enable notifications" option will show a configuration error. Push requires HTTPS and a supporting browser (Chrome, Edge, Firefox).
- **10am calendar reminder**: When there is at least one calendar event on a given day, the app can send a single push at 10am that day to all users with notifications enabled. The message states that there is an upcoming event and lists the event name(s) and time(s). Set `CRON_SECRET` and schedule `GET /api/cron/daily-calendar-notification` at 10am daily (see DEPLOY.md).
- **Requirements**: Install works over HTTPS (or localhost). See [DEPLOY.md](./DEPLOY.md) for production deployment.

## Deploy

See [DEPLOY.md](./DEPLOY.md) for deploying to a VPS with Coolify (Docker + Traefik). The guide covers DNS, Dockerfile, **Docker Compose** (app + Postgres with persistent volume), optional Coolify Postgres resource, environment variables, and troubleshooting.

## Testing

- **Unit tests**: Run `npm run test` (or `npm run test:watch` for watch mode). Tests cover:
  - **Calculations**: Currency (toMinorUnits, fromMinorUnits, formatRand), date utils (prevMonth, nextMonth, monthFromDate, isValidMonth), mortgage (standardMonthlyPayment, simulateSchedule, calculateTopUp, generateSchedule, projectScheduleFromBalance), and budget/summary formulas (balance = income - expenses, remaining = allocated - spent, unallocated, adherencePct).
  - **Calendar**: Recurrence expansion (none, weekly, monthly, yearly) in `src/lib/utils/recurrence.test.ts`.
  - **Design**: Calculation logic is tested in isolation; services use repository interfaces so unit tests mock repositories and assert only on formulas (SOLID, DRY).
- **Integration tests**: In `src/__tests__/integration/api-and-db.integration.test.ts`. They call API route handlers and the real database. They **run only when `DATABASE_URL` is set** (e.g. local Postgres or CI). Use a seeded DB (`npm run db:fresh`). State is restored after each test: created expenses and income are deleted by ID; budget allocation changes are reverted by upserting the previous amount. This keeps the database in its previous state so tests are repeatable and do not pollute dev data.

## Scripts

- `npm run dev` – Start dev server (Turbopack)
- `npm run build` / `npm run start` – Production build and start
- `npm run db:push` – Apply schema and migrations. Postgres: runs `0000_init_pg.sql` when the DB is empty, then `0001`–`0005` (split_groups, recurring, calendar_events, shared_lists, push_subscriptions) if those tables are missing. SQLite: runs `0000_init.sql` when the DB is empty (0001–0003 applied when those tables are missing). Use this after deploying or if you see "groupId missing" on the Splits page.
- `npm run db:reset` – Recreate DB from scratch (Postgres: drop/recreate public schema; SQLite: delete file). Then run push (and optionally seed). Do not run while the app is using the DB.
- `npm run db:seed` – Clear all data, then seed users, categories, 3 months of income/expenses, and sample split expenses
- `npm run db:fresh` – Reset DB then seed (recreate from scratch and seed in one go)
- `npm run generate-pwa-icons` – Generate PWA icons into `public/icons/` (requires `sharp`). Run once or when changing app icon.
- `npm run generate-vapid-keys` – Print VAPID key pair for Web Push. Add the two lines to your env (e.g. `.env.local`) so push notifications work.
- `npm run test` – Run unit and integration tests (Vitest). Integration tests are skipped when `DATABASE_URL` is unset.
- `npm run test:watch` – Run tests in watch mode.
- `npm run start:server` – Start the custom Node server (initDb + persist loop); use for cPanel. See DEPLOY.md.

The app uses a small **database abstraction** (`src/lib/db`): when `DATABASE_URL` is set it uses **Postgres** (via `pg`); otherwise **SQLite** (sql.js, file at `DB_PATH`). Repositories use the same API (`run`, `get`, `all`, `lastInsertId`). Schema is in `drizzle/0000_init.sql` (SQLite) and `drizzle/0000_init_pg.sql` (Postgres); apply with `db:push`.

## Troubleshooting

- **Module type warning**: If you see `MODULE_TYPELESS_PACKAGE_JSON` when running `tsx` scripts (e.g. `db:push`, `db:seed`), the project is already set up with `"type": "module"` in `package.json` so Node treats the project as ESM. If the warning persists, ensure you are on a recent Node 18+ and that no other tool is forcing CommonJS for this package.

- **DEP0169 `url.parse()` deprecation**: The custom server (`server.js`) uses the WHATWG URL API instead of `url.parse()`. If you still see this warning, it is coming from a dependency (e.g. next-auth); upgrade dependencies when newer versions that use the WHATWG API are available.

- **Rayon thread pool panic** (`The global thread pool has not been initialized`, `Resource temporarily unavailable`): This comes from a Rust-based component (often in the Node/Next toolchain, e.g. SWC) when the process cannot create enough threads. Common causes: low memory or thread limits in containers, or many concurrent Node/tsx processes. Mitigations:
  - Run DB scripts one at a time (e.g. do not run `db:reset` and `db:seed` in parallel).
  - In Docker or cPanel, increase memory/CPU limits if possible.
  - On Linux, check `ulimit -u` (max user processes) and raise if needed; avoid running several heavy Node processes at once.
