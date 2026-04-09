# Home Finance

Personal finance app for tracking income, expenses, and budgets.

All database writes use **optimistic UI**: the UI updates immediately, then a toast confirms success (or rolls back on failure).

## Features

- **Income**: Record salary and ad-hoc income per month. **Dashboard income** shows only the signed-in user's income for the selected month.
- **Expenses**: Log expenses by category with optional notes.
  - **Dashboard**: The "Recent" expenses section shows only the signed-in user’s expenses on the **primary account** (set under **Settings** > **Accounts**; with several accounts, use **Set as primary**). If you have only one account, it is always primary. If primary is unset and you have multiple accounts, the app defaults to the oldest bank account, then the oldest account by id. **Quick add expense** uses that same primary account and an expense date for the **budget month you are viewing** (today when it falls in that month, otherwise the start or end of that period), so new rows appear in **Recent expenses** after save. **View more** in that section opens **Expenses** for the same budget month. **Category** selection uses the same **CategoryPicker** as the **`/add`** expense step (most-used strip, optional **Show more** for variable vs fixed groups); on the dashboard, pills show **names only**, not budget amounts on each pill. With **Split with partner** enabled, you can choose split **group**, equal split, full amount owed to you, or exact shares (same behavior as the expense quick-add flow). Use the **Expenses** page to view all accounts or filter by account. A strip of **Tasks / Events / Budget** stats links to Lists, Calendar, and Budget. An **Upcoming events** tile highlights today’s events or the next event and links to the Calendar page.
  - **Exact split helper**: In **Split by exact amount**, the form shows a live helper for remaining amount to allocate (or over-allocated amount) so shares can be balanced before save.
  - **Expenses page**: Toggle to view **My expenses**, another user's expenses (e.g. partner's), or **Combined** income and expenses for the selected view. Income and expense totals are shown for the active filter. Use the **Account** dropdown to show only expenses linked to a specific account (or **All**). Use the **Category** dropdown to show only expenses in a specific category (or **All**).
- **Goals (Intent)**: Track intent separately from spending.
  - **Savings goals**: Set a target amount and monthly target, link to an account (recommended). Add contributions manually; the dashboard shows progress, monthly compliance, and a projected completion month.
  - **Credit goals**: Link to a credit account, set a monthly payment target, optionally store APR. Add manual payments and manual interest from statements. The dashboard shows payoff estimates.
  - **Goals page (`/goals`)**: One goal at a time with **Overview**, **Progress**, **Activity** (every line tied to a real account transaction), **Projection** (dashed styling; live-only, not stored), and **Controls** (contribute, withdraw, pay, interest, edit). Credit projection compares **Avalanche**, **Snowball**, and **Target date** payments side by side. See [docs/goals.md](./docs/goals.md).
  - **Clean UX rule**: Goal contributions are **not expenses**. The Expenses page remains pure “money gone”; contributions appear only on goals/dashboard.
  - **Mental model**: Accounts = truth (ledger), Goals = intent, Contributions = bridge (link ledger movements to goals).
- **Categories**: Each category is either **Fixed** or **Variable** cost.
  - **Fixed**: Same amount each month (e.g. Utilities, Insurance). You can set a default amount (R) in Manage categories; that amount is auto-allocated for new months until you change it.
  - **Variable**: Amount varies by month (e.g. Groceries, Dining out).
- **Budget**: **Per-user**: each signed-in user has their own budget. You see only your income, your expenses, your category allocations, and your transfers. Allocate income to categories per month. **Budget-expense integration**: After adding an expense, a toast shows how much remains in that category for the month (or a warning with link to Budget if over). The dashboard shows an over-budget warning tile when any category is overspent. The category picker (e.g. on quick-add) shows remaining amount per category when budget data is available. Category order can be changed by **drag and drop** (grip handle on the left of each category card); the order is saved and used app-wide (e.g. Manage categories, category pickers). Allocations **carry over**: if a month has no allocation set for a category, the last set allocation from a previous month is used. So you only need to change an allocation when you want it to differ from the previous month.
  - **To be allocated summary (Option 2)**: The headline amount uses `toBeAllocated = (current month income - allocated) + rolloverAdjustment`, where `rolloverAdjustment` is the negative of prior-month cash overspending (combined-safe source: category negatives first, top-level fallback). The summary now clearly shows **to allocate**, **fully allocated**, or **over allocated**.
  - When there is unallocated income, use **Auto-allocate** to distribute the remainder:
    - If you have already set amounts for some categories, the remainder is added to those categories only.
    - If historical expense data exists (past 6 months), the remainder is split in proportion to past spending.
    - If there is no history or no allocations yet, the remainder is split evenly across categories.
  - Opening the budget for a new month automatically fills in carried-over allocations and, for fixed-cost categories with a default amount, that default.
- **Transfers**: Move budget between categories within a month.
- **Budget month range**: Under **Settings**, choose which day each **budget month** starts (1-28). Day `1` is a normal calendar month. For example, day `25` runs from the 25th of one month through the 24th of the next, so you can align the budget with a pay date. The month navigator shows that range when it is not a calendar month. Income, expenses, budget totals, and related APIs use transaction dates within that range.
- **Export transactions**: Under **Settings**, use **Export transactions** to download a CSV of all your income and expense entries (same minor-unit amounts as the app, plus a decimal column for readability). Account transfers and the raw account ledger are not included; those live under **Accounts** / `account_transactions` if you need them in a future export.
- **Accounts**: Track bank balances, savings, and credit. Create accounts under **Settings** > **Accounts** (Bank, Savings, Credit types). The **primary** account is listed **first** and shows a **Primary** badge (used for dashboard **Recent expenses**, **Quick add expense**, and as the default account in expense/income quick-add flows, with no “none” option when you have accounts). If you have exactly one account, it is always primary; with more than one, use **Set as primary** to choose which account is first. Link income and expenses to accounts when adding them; balances are computed from a ledger (`account_transactions`). Use **Transfer Money** (dashboard tile or Settings > Accounts) to move funds between accounts (e.g. bank to savings, or pay down credit). Credit accounts show balance, limit, and available credit. All financial movement flows through `account_transactions`; balances are never stored directly.
- **Splits**: Track shared expenses and who owes whom. **Split groups** (e.g. Home, Wedding) let you keep balances separate: create groups under **Split groups**, then when adding a split expense choose a group (defaults to "Default"). On the **Splits** page you see a summary tile per group and can switch the active group to see "How much each person owes" and **Split history** for that group only. Settling is per group: use **Settle** and the amount is applied to the current group's balance. You can also settle from the dashboard by adding an expense with category **Splits** (applies to the default group).
- **Summary**: Per-user monthly snapshot (your income, expenses, and budget adherence) and household trends.
- **Add / quick-create (`/add`)**: On **mobile**, the **center Add** control (floating pill in the bottom bar) opens the **Create new** hub: cards for **New task** (list item), **New event**, and **New expense**, plus a **Quick add** line (type + optional text for tasks). For **Expense**, you can enter a leading amount and optional note (e.g. `120 groceries`); after **Add**, the category step shows that **amount** at the top and pre-fills the note. Desktop users can open the same screen from the sidebar **Add** link. After a successful save from this hub (or the same flows from the **+** quick-add menu when shown), you are taken to **Dashboard** for an expense, **`/lists/[id]`** for a task (the list you picked), or **Calendar** for an event. The dashboard **Quick add expense** tile keeps one-screen logging on Home; its category UI matches this step (same **CategoryPicker**).
- **Mobile bottom bar**: **Home**, **Calendar**, **Add** (center), **Lists**, **Budget**. The **hamburger menu** (header, small screens) lists the same destinations as the **desktop sidebar** (Dashboard, Calendar, Add, Lists, Expenses, **Recon**, Splits, Budget, Accounts, Mortgage, Goals, Summary, Settings).
- **Dashboard greeting**: The greeting and displayed weekday/date use **UTC+2** (IANA `Africa/Johannesburg`), not the device timezone (**Good morning**, **Good afternoon**, **Good evening** by that clock).
- **Calendar**: Month grid and day schedule (see `/calendar`). On **mobile-width** screens, **swipe left/right on the month grid** to move between months (chevrons still work). Events support optional **end date** (multi-day spans shown as a **pill across days** in the month grid), optional **end time**, **calendar category** (color-coded dots, bars, and span pills; separate from budget categories), **shared vs personal** visibility, **priority**, name, location, start date, start time, notes, and **reminder** (None, at event time, or 5/10/15/30 min, 1–2 hours, 1 day before). **End date** applies when recurrence is **none**; recurring events use one day per occurrence. **Shared** events are visible to both users; **personal** events only to the creator (list, dashboard tile, daily summary). Recurrence: none, weekly, monthly (optional day of month), or yearly. Any user can edit or delete any event (household model); change API checks if you need creator-only edits. Push: partner is notified when someone adds a **shared** event; reminders go to everyone for shared events and only to the creator for personal events.
- **Lists**: Shared lists (household-wide) and personal lists (per-user only). **Lists** in the nav opens **My lists**: filter chips (**All** + one per list), progress per list, and inline items with check-to-complete, quantity, and **Open** for full detail. Under **Settings** > **Lists**, create and delete lists, and use **List items** to pick a list and add or remove checklist rows (same controls as the list detail page). The list detail page (`/lists/[id]`) has the list switcher, add-item form, and **Delete all completed**.
- **Mortgage**: Optional mortgage tracking. The page uses plain-language labels and a single at-a-glance summary (what you still owe - balance after last payment - total per month, when you will be done paying, each person’s share of the home). The amortisation table and form to change the loan or who pays what are in a collapsible **More details** section below.
  - **Past vs future**: Months in which you have recorded payments show **actual** amounts paid (e.g. 10k one month, 5k another). When you change the interest rate or payment (config or user shares), only **future** months are recalculated; past months stay as paid. The projection runs from the current remaining balance, so payoff date and equity reflect the new rate and payment from “today” onward.

- **Recurring income and expenses**: Under **Recurring income** and **Recurring expenses** you define templates (amount, category for expenses, day of month). Each month, use **Populate this month** in **Settings** to create actual income and expense rows from those templates. Population is idempotent: it only creates entries that do not already exist for that month, so you can run it again safely. If you use a custom budget-month start day (for example 25th), recurring items are placed on the correct calendar date inside that budget period.
- **AI expense analysis (optional)**: Optional AI module for monthly expense analysis (dashboard + Summary). Configure **Free AI** and/or **Paid AI** via env vars; each user can toggle which tier to use under **Settings** > **AI analysis**. The analysis sends the current month’s budget summary to Google Gemini and returns a short plain-text analysis (patterns, advice, anomalies). After each successful run, you can open the exact AI input payload in a new tab (for copy/refinement), and the app stores the run in `ai_analysis_runs` (structured `input_json` + prompt template id/version + output + month + timestamp + user). Rate-limited to 5 calls per user per hour.
- **Recon (`/recon`)**: Optional bank-email reconciliation via **Microsoft Graph** (the HTTP REST API; not GraphQL). Turn **Bank email reconciliation (Recon)** **on** under **Settings** first; the **Recon** nav item and page stay hidden until then (separate from push or other mail-related settings). After you connect Outlook and sync, the app fetches recent messages, parses bank-style notifications (amount, merchant, and yearless **DDMon** dates such as `8Apr 15:52`, with logic to skip spurious matches on text like `.00 paid`), flags potential duplicates against your expenses, and lets you **manually** accept or ignore each item. For **possible duplicate** rows, the matching expense(s) already on file are listed under the row (**category**, **amount**, **note**, **date**). On the pending list, use **Mark** (None / Ignore / Accept) and **Process marked** for bulk actions (marked rows are shaded; after a run you get a **summary** with date range, counts, category totals for new expenses, and separate totals for accepted vs ignored bank amounts; and a toast shows the **total value** of newly added **Split 50/50** purchases), or use per-row buttons; **Accept** without a category is skipped until you choose one. Edit **Amount** (ZAR) or **Expense note** before accepting if the parsed values need correction (defaults come from the bank line and `Recon` / `Recon: {vendor}`). Click **Description** to open the full email in a modal (same detail view as after sync). The **Fetched emails** list (after sync) can be narrowed to **bank sender addresses** (type A & B) and by **outcome** (imported, parse failed, or not bank). When approving an item, you can optionally tick **Split 50/50** so the created expense is a split expense. See [docs/recon.md](./docs/recon.md) and [Recon and Microsoft Graph (Outlook)](#recon-and-microsoft-graph-outlook) below.

## Setup

1. Install dependencies: `npm install`
2. Set environment variables (for local dev, use `.env.local`) and set `AUTH_SECRET`. **Required** for any real use: set `DATABASE_URL=postgresql://user:password@host:5432/dbname` (Postgres is required). If `DATABASE_URL` is missing, `next dev` / `next start` still boot and log a warning; the instrumentation hook skips DB init and the in-process notification scheduler until the URL is set—routes that hit the database will error until you configure Postgres. Optionally set:
   - **Push notifications**: `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` (run `npm run generate-vapid-keys` and add the output to `.env.local`; required for enabling push in the app).
   - **Scheduled notifications**: `TZ` (e.g. `Africa/Johannesburg`) for daily 9am and per-event reminder timing; optional `DAILY_NOTIFICATION_HOUR` (0-23, default 9). Optional `CRON_SECRET` if you call the cron endpoint from an external scheduler.
   - **AI analysis** (optional):
     - **Free tier**: `GEMINI_FREE_API_KEY` (or legacy `GEMINI_API_KEY`) and optionally `GEMINI_FREE_MODEL`
     - **Paid tier**: `GEMINI_PAID_API_KEY` and optionally `GEMINI_PAID_MODEL`
     - Each user can choose **Free AI** vs **Paid AI** under **Settings** > **AI analysis**. If the selected tier is not configured, the analysis button is hidden and enabling Paid AI in Settings is rejected with an error.
   - **Seed**: `SEED_USER1_EMAIL`, `SEED_USER2_EMAIL`, `SEED_USER_PASSWORD`, etc. (see `.env.example`).
3. Create the database and seed: `npm run db:fresh` (recreates the DB from scratch, then seeds), or:
   - Reset and create tables: `npm run db:reset` (drops/recreates DB, runs schema push, then seeds minimal categories and users).
   - Seed: `npm run db:seed` (clears all data, then inserts users, categories, 3 months of income/expenses, and sample split expenses).

**Local Postgres with Docker:** Run `docker compose up --build`, then in the app container run push and seed (see [DEPLOY.md](./DEPLOY.md)).

**Docker Compose Watch (local dev):** Use the `watch` profile so the stack runs the dev image (`Dockerfile.dev`) with file sync and targeted rebuilds instead of the production `app` service:

```bash
docker compose --profile watch up db app-dev --watch
```

- Starts Postgres and **app-dev** on [http://localhost:3000](http://localhost:3000) with `next dev` (Turbopack).
- Edits under `src/`, `public/`, and `drizzle/` sync into the container; changes to `next.config.ts`, `postcss.config.mjs`, `server.js`, or `tsconfig.json` sync and restart the dev process; `package.json` / `package-lock.json` changes trigger an image rebuild.
- Do not run `app` and **app-dev** together (both use port 3000). Default `docker compose up --build` still uses the production **app** image for parity with deploys.

### Recon and Microsoft Graph (Outlook)

The Recon feature uses **Microsoft Graph** (OAuth 2.0 + REST) to read mail. It is **not** GraphQL; you register an app in Microsoft Entra ID (Azure AD) and grant delegated **Mail.Read** (and optional **User.Read** for profile display).

### Azure app registration (one-time)

1. In [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** → **New registration**.
2. **Name**: e.g. `HomeFinance Recon`. **Supported account types**: choose **Accounts in any organizational directory and personal Microsoft accounts** (or **Personal Microsoft accounts only** if you only use `@outlook.com` / `@live.com`).
3. **Redirect URI**: platform **Web**, URI exactly:
   - `{NEXTAUTH_URL}/api/recon/graph/callback`  
   Example production: `https://your-domain.com/api/recon/graph/callback`  
   Example local: `http://localhost:3000/api/recon/graph/callback`
4. After creation, open **Certificates & secrets** → **New client secret**; copy the value (shown once).
5. **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions** → add:
   - `Mail.Read`
   - `User.Read` (optional; used to show the mailbox address after connect)
   - `offline_access` is requested in code so refresh tokens work; consent covers it when you grant Mail.Read.
6. **Grant admin consent** is not required for personal Microsoft accounts; the first user who connects will see the Microsoft consent screen.

### Environment variables

Add to `.env.local` (or your deployment env):

| Variable | Purpose |
|----------|--------|
| `NEXTAUTH_URL` | Public base URL of the app (**no trailing slash**). Required for OAuth redirect and callback. Use `http://localhost:3000` in dev. |
| `GRAPH_OAUTH_CLIENT_ID` | Application (client) ID from the app registration. |
| `GRAPH_OAUTH_CLIENT_SECRET` | Client secret value. |
| `GRAPH_OAUTH_TENANT` | Optional. Default `common` (work + personal Microsoft accounts). Use a specific tenant ID if you only use one org. |
| `RECON_TOKEN_ENCRYPTION_KEY` | Optional. Strong secret used to encrypt stored Graph refresh tokens. If omitted, `AUTH_SECRET` is used (must be at least 16 characters). |

Aliases supported in code: `MICROSOFT_GRAPH_CLIENT_ID`, `MICROSOFT_GRAPH_CLIENT_SECRET`, `MICROSOFT_GRAPH_TENANT` for the same values.

### How authentication works

1. You sign in to Home Finance with **email + password** (existing credentials).
2. Under **Settings**, enable **Bank email reconciliation (Recon)** so the **Recon** page appears in the menu.
3. Open **Recon** and choose **Connect Outlook** (or visit `/api/recon/graph/connect` while logged in). The app redirects to Microsoft’s login page.
4. You sign in with your Microsoft account (e.g. `matthew.j@live.com`) and **consent** to Mail.Read.
5. Microsoft redirects back to `/api/recon/graph/callback` with an authorization code. The server exchanges it for tokens, stores an **encrypted refresh token** per user, and redirects you to `/recon`.
6. **Sync** uses the refresh token to obtain short-lived access tokens and calls Graph `GET /me/messages` (read-only). Disconnect removes the stored connection from the database.

**Troubleshooting**: If redirect URI does not match exactly (http vs https, port, path), or `NEXTAUTH_URL` is wrong, OAuth fails. Ensure the app registration redirect URI matches `getGraphRedirectUri()` = `{NEXTAUTH_URL}/api/recon/graph/callback`.

If you see redirects to `https://0.0.0.0:3000/...` in production, your reverse proxy is not providing a correct request origin (Host / `x-forwarded-*` headers) to Next.js, or the app is using the request origin for redirects. Set `NEXTAUTH_URL` correctly and ensure the proxy forwards `x-forwarded-host` and `x-forwarded-proto` (Coolify/Traefik defaults are usually fine). The Recon Graph callback redirects now prefer `NEXTAUTH_URL` over the request origin.

### Database migrations and existing data

- **`npm run db:push`** (used on deploy and in Docker entrypoint) runs **additive** migrations only: it creates tables or columns when they are **missing**. It does **not** `DROP` tables, `TRUNCATE` data, or wipe rows. Your existing expenses, users, and other data stay intact when new migrations (e.g. Recon tables in `drizzle/0013_recon_pg.sql`) are applied.
- **Destructive operations** (only when you explicitly want to reset): `npm run db:reset` drops and recreates the public schema; `npm run db:seed` clears application data; `npm run db:fresh` combines reset + seed. Do not use those on production databases you care about.

## Seed data

Seed always creates:

- Two users (see `.env.example` for `SEED_USER1_EMAIL`, `SEED_USER2_EMAIL`, etc.).
- Default categories (fixed/variable and default amounts where applicable).
- **3 months** of income and expenses for **both users**: current month and the two previous months. Income includes monthly salary per user plus ad-hoc entries; expenses are spread across categories and both users.
- **Per-user budget allocations** for the same 3 months: each user gets allocation rows for the main categories (groceries, transport, utilities, savings, etc.) and one sample **budget transfer** (savings to groceries) so the Budget page shows meaningful data for each user.
- **Split expenses** (current month): e.g. groceries split equally, dinner split equally, and a full-amount-owed utility expense, so the Splits page shows who owes whom. A **Splits** category is included for settlement expenses.
- **Goals**: Sample savings and credit goals per user, with example goal contributions, credit payment, and a manual interest entry (all linked to the account ledger).

Amounts use the same integer format as the app (e.g. cents). To start with an empty transaction history, you would need to change the seed script or clear income/expenses after seeding.

## PWA (install as app)

HomeFinance can be installed as a Progressive Web App (PWA) on phones and desktops for home-screen access and optional offline use.

- **Manifest and service worker**: The app uses a static `public/manifest.json` and [Serwist](https://serwist.pages.dev/) for the service worker (precache, runtime cache, offline fallback). In development the service worker is disabled; use a production build to test install. Explicit Apple meta tags and manifest link in the root layout ensure iOS installs in **standalone** mode (not as a bookmark).
- **Icons and splash screens**: PWA icons and iOS splash screens live in `public/icons/`. Generate them with:
  ```bash
  npm run generate-pwa-icons
  ```
  This creates `icon-180x180.png`, `icon-192x192.png`, `icon-512x512.png`, `icon-maskable-512x512.png`, and iOS `splash-*` images for common device sizes. To use your own icon, replace the PNGs (see `public/icons/README.md`). Maskable icons should keep important content in the center 80%.
- **Install prompt**: When the app meets install criteria (HTTPS, valid manifest, service worker, icons), supported browsers show a custom install banner. The app detects standalone mode and hides the prompt when already installed. **On iOS Safari**: the prompt appears after a 3-second delay; tap "How to Install" to expand step-by-step instructions (Share, Add to Home Screen, Add). Dismiss is per-session. **On Android/desktop**: the native install prompt is shown when the user taps Install. An apple-touch-icon and iOS splash screens ensure a proper home-screen launch on iOS.
- **Push notifications**: The app can send Web Push notifications when the PWA is in the background or closed. In **Settings**, use the "Push notifications" section to enable (browser will ask for permission), send a test, or disable. The service worker handles incoming push and notification clicks (opens the app or a URL). Set VAPID keys: run `npm run generate-vapid-keys` and add `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` to your environment. Push requires HTTPS and a supporting browser (Chrome, Edge, Firefox; iOS 16.4+ when installed as PWA from home screen).
- **Push notifications (reopen behavior)**: On reopen/resume, settings now re-check permission/subscription and re-sync existing subscriptions to the server to reduce Android/PWA cases where users needed to disable/enable again.
- **Scheduled notifications**: An in-process scheduler (runs when the server starts) sends:
  - **Daily 9am summary**: If there is at least one calendar event today, a single push at 9am (configurable: `DAILY_NOTIFICATION_HOUR`, default 9; timezone: `TZ`, default UTC) to all users with notifications enabled, listing event name(s) and time(s).
  - **Per-event reminders**: For events with a reminder set (e.g. 15 minutes before), a push is sent to all users when that reminder time is reached. Set the reminder in the calendar event form (create/edit).
- **Real-time notifications**: When one user adds a **todo** (list item), a **calendar event**, or a **split expense**, the other user receives a push (e.g. "User One added 'Milk' to Shopping", "User One added event 'Dentist' on 2025-03-15").
- **Cron endpoint (optional)**: `GET /api/cron/daily-calendar-notification` can be called externally (e.g. cron job) as a fallback for the daily summary. Protect with `CRON_SECRET` (Authorization header or `x-cron-secret`). See DEPLOY.md.
- **Requirements**: Install works over HTTPS (or localhost). See [DEPLOY.md](./DEPLOY.md) for production deployment.

## Deploy

See [DEPLOY.md](./DEPLOY.md) for deploying to a VPS with Coolify (Docker + Traefik). The guide covers DNS, Dockerfile, **Docker Compose** (app + Postgres with persistent volume), optional Coolify Postgres resource, environment variables, and troubleshooting. If the build fails with **no space left on device** or **ENOSPC** (often during `npm ci` or `COPY ... node_modules`), the build host is out of disk space; see DEPLOY.md for freeing space, pruning Docker, or building the image in CI and pulling it on Coolify.

## Testing

- **Unit tests**: Run `npm run test` (or `npm run test:watch` for watch mode). Tests cover:
  - **Calculations**: Currency (toMinorUnits, fromMinorUnits, formatRand), date utils (prevMonth, nextMonth, monthFromDate, isValidMonth), mortgage (standardMonthlyPayment, simulateSchedule, calculateTopUp, generateSchedule, projectScheduleFromBalance), and budget/summary formulas (balance = income - expenses, remaining = allocated - spent, unallocated, adherencePct).
  - **Finance calculation layer**: Pure financial formulas live in `src/lib/services/finance/*` and are tested in `src/tests/finance.test.ts` (including golden scenarios for deterministic simulations). Services include small parity checks against the pure helpers in `src/tests/finance.service-non-regression.test.ts` to ensure no regressions.
  - **Calendar**: Recurrence expansion (none, weekly, monthly, yearly) in `src/lib/utils/recurrence.test.ts`.
  - **Design**: Calculation logic is tested in isolation; services call pure helper functions in `src/lib/services/finance/*` and use repository interfaces so unit tests mock repositories and assert only on formulas (SOLID, DRY).
- **Integration tests**: In `src/__tests__/integration/api-and-db.integration.test.ts`. They call API route handlers and the real database. They **run only when `DATABASE_URL` is set** (e.g. local Postgres or CI). Use a seeded DB (`npm run db:fresh`). State is restored after each test: created expenses and income are deleted by ID; budget allocation changes are reverted by upserting the previous amount. This keeps the database in its previous state so tests are repeatable and do not pollute dev data.

## Scripts

- `npm run dev` – Start dev server (Turbopack)
- `npm run build` / `npm run start` – Production build and start
- `npm run db:push` – Apply **additive** schema and migrations (creates missing tables/columns; does not delete existing data). Runs Postgres migrations from `drizzle/` (including numbered steps like `0013_recon_pg.sql`) when tables or columns are missing. Use this after deploying or if you see "groupId missing" on the Splits page.
- `npm run db:reset` – Recreate DB from scratch (drop/recreate public schema). Then run push (and optionally seed). Do not run while the app is using the DB.
- `npm run db:seed` – Clear all data, then seed users, categories, 3 months of income/expenses, and sample split expenses
- `npm run db:fresh` – Reset DB then seed (recreate from scratch and seed in one go)
- `npm run generate-pwa-icons` – Generate PWA icons into `public/icons/` (requires `sharp`). Run once or when changing app icon.
- `npm run generate-vapid-keys` – Print VAPID key pair for Web Push. Add the two lines to your env (e.g. `.env.local`) so push notifications work.
- `npm run test` – Run unit and integration tests (Vitest). Integration tests are skipped when `DATABASE_URL` is unset.
- `npm run test:watch` – Run tests in watch mode.
- `npm run start:server` – Start the custom Node server (initDb + persist loop); use for cPanel. See DEPLOY.md.

The app uses **Postgres** only (via `pg`). `DATABASE_URL` is required. Repositories use a small abstraction (`run`, `get`, `all`, `lastInsertId`). Schema is in `drizzle/0000_init_pg.sql` and numbered migrations; apply with `db:push`.

## Troubleshooting

- **Module type warning**: If you see `MODULE_TYPELESS_PACKAGE_JSON` when running `tsx` scripts (e.g. `db:push`, `db:seed`), the project is already set up with `"type": "module"` in `package.json` so Node treats the project as ESM. If the warning persists, ensure you are on a recent Node 18+ and that no other tool is forcing CommonJS for this package.

- **DEP0169 `url.parse()` deprecation**: The custom server (`server.js`) uses the WHATWG URL API instead of `url.parse()`. If you still see this warning, it is coming from a dependency (e.g. next-auth); upgrade dependencies when newer versions that use the WHATWG API are available.

- **Rayon thread pool panic** (`The global thread pool has not been initialized`, `Resource temporarily unavailable`): This comes from a Rust-based component (often in the Node/Next toolchain, e.g. SWC) when the process cannot create enough threads. Common causes: low memory or thread limits in containers, or many concurrent Node/tsx processes. Mitigations:
  - Run DB scripts one at a time (e.g. do not run `db:reset` and `db:seed` in parallel).
  - In Docker or cPanel, increase memory/CPU limits if possible.
  - On Linux, check `ulimit -u` (max user processes) and raise if needed; avoid running several heavy Node processes at once.
