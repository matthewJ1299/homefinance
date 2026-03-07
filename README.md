# Home Finance

Personal finance app for tracking income, expenses, and budgets.

## Features

- **Income**: Record salary and ad-hoc income per month.
- **Expenses**: Log expenses by category with optional notes.
  - **Dashboard**: The "Recent" expenses section shows only the signed-in user's expenses.
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
- **Splits**: Track shared expenses and who owes whom. On the Splits page you see per-person balances (owed to you / you owe). You can settle in two ways: (1) On the **Splits** page use **Settle** and enter the amount (capped at what you owe) and optional date; (2) On the **dashboard**, add an expense with category **Splits** and the amount you paid. In both cases a Splits expense is recorded for you and ad-hoc income for the recipient; the balance is reduced and the settlement appears in **Split history** (e.g. "You paid [name] R X"). The amount you enter when settling from the dashboard cannot exceed what you currently owe.
- **Summary**: Per-user monthly snapshot (your income, expenses, and budget adherence) and household trends.
- **Mortgage**: Optional mortgage tracking. The page uses plain-language labels and a single at-a-glance summary (what you owe, total per month, when you will be done paying, each person’s share of the home). The amortisation table and form to change the loan or who pays what are in a collapsible **More details** section below.
  - **Past vs future**: Months in which you have recorded payments show **actual** amounts paid (e.g. 10k one month, 5k another). When you change the interest rate or payment (config or user shares), only **future** months are recalculated; past months stay as paid. The projection runs from the current remaining balance, so payoff date and equity reflect the new rate and payment from “today” onward.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and set `AUTH_SECRET` (and optionally `DB_PATH`, seed overrides).
3. Create the database and seed: `npm run db:fresh` (recreates the DB from scratch from the schema, then seeds), or:
   - Reset and create tables: `npm run db:reset` (deletes the DB file, runs schema push, then seeds minimal categories and users)
   - Seed: `npm run db:seed` (clears all data, then inserts users, categories, 3 months of income/expenses, and sample split expenses)

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
- **Install prompt**: When the app meets install criteria (HTTPS, valid manifest, service worker, icons), supported browsers may show a custom "Install" banner (once per device until dismissed). The app also detects standalone mode and hides the prompt when already installed.
- **Requirements**: Install works over HTTPS (or localhost). See [DEPLOY.md](./DEPLOY.md) for production deployment.

## Deploy

See [DEPLOY.md](./DEPLOY.md) for deploying to a VPS with Coolify (Docker + Traefik). The guide covers DNS, Dockerfile, persistent storage, environment variables, and troubleshooting.

## Scripts

- `npm run dev` – Start dev server (Turbopack)
- `npm run build` / `npm run start` – Production build and start
- `npm run db:push` – Apply schema to the database (runs migration SQL; uses sql.js, no native bindings)
- `npm run db:reset` – Recreate DB from scratch (delete file, then push schema). Do not run while the app is using the DB.
- `npm run db:seed` – Clear all data, then seed users, categories, 3 months of income/expenses, and sample split expenses
- `npm run db:fresh` – Reset DB then seed (recreate from scratch and seed in one go)
- `npm run generate-pwa-icons` – Generate PWA icons into `public/icons/` (requires `sharp`). Run once or when changing app icon.
- `npm run start:server` – Start the custom Node server (initDb + persist loop); use for cPanel. See DEPLOY.md.

The app uses **sql.js** (pure JavaScript SQLite) and raw SQL; no ORM. Schema is applied via migration SQL in `drizzle/0000_init.sql` when you run `db:push`.

## Troubleshooting

- **Module type warning**: If you see `MODULE_TYPELESS_PACKAGE_JSON` when running `tsx` scripts (e.g. `db:push`, `db:seed`), the project is already set up with `"type": "module"` in `package.json` so Node treats the project as ESM. If the warning persists, ensure you are on a recent Node 18+ and that no other tool is forcing CommonJS for this package.

- **DEP0169 `url.parse()` deprecation**: The custom server (`server.js`) uses the WHATWG URL API instead of `url.parse()`. If you still see this warning, it is coming from a dependency (e.g. next-auth); upgrade dependencies when newer versions that use the WHATWG API are available.

- **Rayon thread pool panic** (`The global thread pool has not been initialized`, `Resource temporarily unavailable`): This comes from a Rust-based component (often in the Node/Next toolchain, e.g. SWC) when the process cannot create enough threads. Common causes: low memory or thread limits in containers, or many concurrent Node/tsx processes. Mitigations:
  - Run DB scripts one at a time (e.g. do not run `db:reset` and `db:seed` in parallel).
  - In Docker or cPanel, increase memory/CPU limits if possible.
  - On Linux, check `ulimit -u` (max user processes) and raise if needed; avoid running several heavy Node processes at once.
