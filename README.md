# Home Finance

Personal finance app for tracking income, expenses, and budgets.

All database writes use **optimistic UI**: the UI updates immediately, then a toast confirms success (or rolls back on failure).

## Features

Grouped by area. Deeper behaviour for goals, AI, Recon, and access control is in the linked docs.

### Look and feel

- **Themes** — Shared CSS variables in `src/app/globals.css` feed Tailwind semantic colours for **light** and **dark** (cool light surfaces and blue accents; dark mode uses tinted navy cards instead of pure black). Use the header theme toggle (`next-themes`).

### Multi-household tenancy

- Each user belongs to **exactly one household**. Domain data (categories, transactions, budgets, goals, lists, calendar, Recon, AI runs, etc.) is scoped by **`household_id`** so independent families do not see each other’s data in a shared database.
- **Onboarding**: register at **`/register`** to create a pending household (super-admin approves from **`/admin/houses/[id]`**), or a super-admin provisions from **`/admin`**. Password rules and forced change: [docs/passwords.md](./docs/passwords.md). For local dev use **`npm run db:seed`** for a full demo household, or **`npm run db:push && npm run db:seed:users`** for login users only. Details: [docs/multi-household.md](./docs/multi-household.md).
- **Existing installs**: run **`npm run db:push`** to apply `drizzle/0027_households_pg.sql` via the migration ledger; the migration is idempotent and safe to retry if an older deploy stopped mid-run around `calendar_categories`. Legacy installs are backfilled into a single default household unless you already split data across households. Users should **sign out and sign in** once so the session/JWT includes `householdId`.

### Admin portal (global super-admin)

- The admin portal lives under **`/admin`** and is only accessible to users with **`users.is_super_admin = true`**. The app sidebar shows an **Admin** link when you are a super-admin.
- **Houses** — create households, view member counts and entitlement chips, open a detail screen to rename, approve pending registrations, and edit feature checkboxes plus AI tier (`free` / `paid`).
- **Users** — create users, reset passwords (one-time temp password), search/filter, move between households, toggle super-admin. Feature access is per household, not per user.
- **Features** — catalogue view with how many households have each sellable feature and whether this server is configured for it.
- **Queries** — allowlisted read-only operational counts (loaded server-side on `/admin/queries`).
- **Setup**: run **`npm run db:push`** for migrations through `0032_household_approval_pg.sql`. Grant super-admin with `UPDATE users SET is_super_admin = true WHERE email = 'you@example.com';`
- See [docs/feature-access.md](./docs/feature-access.md) for the entitlement model.

### Setup guide (onboarding)

- New users with `setup_wizard_status = not_started` are sent to **`/welcome`** — a full-page, skippable five-step flow: accounts, payday, income, categories, and first budget allocation.
- Progress is resumable via **`users.setup_wizard_step`** (migration `0031`). Incomplete setups show a **`SetupProgressBanner`** on the dashboard.
- Re-run from **Settings** > **Setup guide**. See [docs/onboarding.md](./docs/onboarding.md).

### Setup wizard (legacy modal)

- The modal wizard was removed; persistence columns on `users` are shared with the new flow. See [docs/setup-wizard.md](./docs/setup-wizard.md).

### Money in and out

- **Income** — Record salary and one-off income per month. The dashboard shows only **your** income for the selected budget month.
- **Transactions** (`/expenses`) — Log spending by category with notes and link rows to accounts; the same page shows month income totals and balance. Switch between **My** activity, another household member’s, or **Combined**; filter by account and category and **search** the expense list. When splitting with a partner, pick a split group plus equal split, exact amounts (live helper to balance to zero), or “full amount owed to you.”
- **Categories** — **Fixed** categories behave like steady monthly costs and can seed new months with a default amount; **variable** categories change month to month.

### Budget

- **Per-user budgets** — Each person has their own income, category allocations, and in-month transfers. Drag categories on the Budget page to reorder them everywhere (including pickers).
- **Allocations** — If a month has no amount for a category, the last saved allocation is reused. New months pre-fill carry-over and fixed-category defaults.
- **Unallocated income** — The header explains whether you still have cash to assign, are fully allocated, or are over-allocated, including rollover from prior overspending. **Auto-allocate** spreads leftovers using your current category amounts, recent spending if available, or an even split.
- **Budget and spending** — After you save an expense, a toast shows remaining budget for that category or an over-budget warning with a link. Pickers can show per-category remaining when data exists; the dashboard flags any overspent category.
- **Budget transfers** — Move allocated amounts between categories in the same month.
- **Budget month** — Under **Settings**, pick which calendar day (1–28) each budget period starts (e.g. align with payday). Totals use transaction dates inside that window.

### Accounts and balances

- **Account types** — Bank, savings, and credit under **Settings** > **Accounts**. Balances are derived from an **account ledger** of transactions.
- **Primary account** — Dashboard **Recent transactions** (combined income + expenses for the month) and **Quick add expense** respect the primary account when filtering (**Set as primary** when you have more than one; a single account is always primary). Dates fall inside the budget month you are viewing; **View more** opens the **Transactions** page for that month.
- **Moving money between accounts** — **Transfer Money** (dashboard or Settings) for savings moves or paying down credit. Credit rows show limit and available credit.

### Shared costs (Splits)

- **Split groups** — Separate “who owes whom” per context (e.g. home vs. trip). New split expenses default to a **Default** group unless you choose another.
- **Splits page** — Per-group summary and history; **Settle** applies to the active group. You can also settle with a **Splits** category expense (default group) from the dashboard.
- **`/what-i-owe`** — Statement of what you owe the other person (default), or what they owe you (toggle). Split **balance** is net since the last full settlement (expand for line items and the offsetting side) plus this month’s mortgage share. Gated by household entitlement to the `what_i_owe` feature; contact an administrator to enable. `/owed-to-me` redirects here.

### Goals (savings and debt intent)

- **Savings goals** — Target amount, monthly target, optional linked account; manual contributions; progress and projected completion on the dashboard.
- **Credit goals** — Linked credit account, payment targets, optional APR; manual payments and statement interest; payoff-style projections.
- **`/goals` experience** — Activity is tied to real ledger movements; credit views can compare payoff strategies. **Contributions are not ordinary expenses** (they stay off the Expenses page). See [docs/goals.md](./docs/goals.md).

### Household coordination

- **Calendar** — Month grid and day views, multi-day spans, recurrence, **multiple reminders** per event (offset + optional send time), color categories (separate from budget categories), shared vs. personal events, priorities, and notes. On narrow screens, swipe the month grid to change months. Push follows shared vs. personal rules. See [docs/calendar.md](./docs/calendar.md).
- **Lists** — Shared household lists and personal lists; **My lists** overview; detail at `/lists/[id]` with check-off, quantity, **per-user optional notes**, drag-to-reorder, and **Delete all completed**. Manage under **Settings** > **Household data** > **Lists** (items load when you first expand that section).
- **Settings** — Grouped into **Profile**, **Preferences**, **Household data**, and **Data & export**. See [docs/onboarding.md](./docs/onboarding.md) for the setup guide under Profile.

### Home dashboard and navigation

- **Dashboard** — Month income with inline quick add (**Salary** or **Other income**), **Recent transactions** (newest income and expenses, optionally filtered to the primary account), tasks/events/budget shortcuts, upcoming calendar, quick-add expense (same category UX as **`/add`**). Greeting and header date use **Africa/Johannesburg (UTC+2)**, not the device clock. Under **Settings** > **Preferences** > **Dashboard tiles**, toggle only tiles that are actually wired on the dashboard (quick add, calendar, split balance, budget warning, AI button, transactions, income).
- **Create hub (`/add`)** — Mobile center **Add** and desktop sidebar: new list item, event, or expense; quick line for tasks; expense shorthand such as `120 groceries` pre-fills amount and note. After save: expense → Dashboard; task → that list; event → Calendar.
- **Mobile** — Bottom bar: Home, Calendar, Add (center), Lists, Budget. Desktop uses a left sidebar (collapsible). The header menu mirrors the desktop sidebar, including **Recon**, **Budget AI report**, and **What I owe** when those are enabled for your account.

### Mortgage (optional)

Plain-language summary of balance, monthly cost, payoff horizon, and each person’s share; amortisation and edits sit under **More details**. Recorded months stay as history; changing rate or payment recalculates only **future** schedule from the current balance. **Interest rate changes** (e.g. 10% for months 1–5, then 11%) recalculate the upcoming minimum payment from the reduced balance — see [docs/mortgage.md](./docs/mortgage.md).

### Automation and export

- **Recurring income and expenses** — Day-of-month templates; **Populate this month** in **Settings** adds missing rows only (safe to repeat). Works with custom budget-month boundaries.
- **Export transactions** — **Settings** > **Export transactions** → CSV of income and expense lines (minor units plus a decimal column). Inter-account transfers and raw ledger are not in that export.

### Summary and optional intelligence

- **Summary** — Per-user monthly snapshot (income, expenses, budget adherence) plus household trends.
- **AI budget analysis (optional)** — Household entitlement (super-admin) plus server API keys. **Free** vs **Paid** tier on the household. **Analyze spending** on Home when enabled; full report at `/budget-ai-report`. See [docs/ai-budget-analysis.md](./docs/ai-budget-analysis.md) and [docs/feature-access.md](./docs/feature-access.md).
- **Bank email reconciliation / Recon (optional)** — Outlook via Microsoft Graph when the household is entitled. Connect and sync from **Recon**; accept or ignore parsed rows manually. See [docs/recon.md](./docs/recon.md) and [Recon and Microsoft Graph (Outlook)](#recon-and-microsoft-graph-outlook).

## Setup

1. Install dependencies: `npm install`
2. Configure **environment variables** (see [Environment variables](#environment-variables)). For local development use **`.env.local`** (Next.js loads it automatically). **Minimum for real use:** `DATABASE_URL`, `AUTH_SECRET`, and `NEXTAUTH_URL` (public app URL, no trailing slash). If `DATABASE_URL` is missing, the app still starts but logs a warning and skips DB-backed startup hooks; routes that hit the database will fail until Postgres is configured.
3. Create the database and seed: `npm run db:fresh` (recreates the DB from scratch, then seeds full demo data), or:
   - Reset and create tables only: `npm run db:reset` (drops/recreates DB and runs schema push; no users or demo data are inserted).
   - Seed only the two login users: `npm run db:seed:users` (creates or updates Matt and Sydney in **Jordaan household**, with all features enabled).
   - Minimal setup seed: `npm run db:seed:minimal` (assumes an empty DB and seeds one household, default categories, split group, calendar categories, and two users).
   - Full demo seed: `npm run db:seed` (clears all data, then seeds one fully populated Jordaan household).
   - **Add more households/users**: sign in as super-admin at `/admin`, or use public **`/register`** (creates a pending household until approved). Grant super-admin with `UPDATE users SET is_super_admin = true WHERE email = '…';`.

**Local Postgres with Docker:** Run `docker compose up --build` to start Postgres and the production app image on the internal Compose network (deploy parity), then in the app container run push and seed (see [DEPLOY.md](./DEPLOY.md)).

**Docker Compose Watch (local dev):** Use the `watch` profile so the stack runs the dev image (`Dockerfile.dev`) with file sync and targeted rebuilds instead of the production `app` service:

```bash
docker compose --profile watch up db app-dev --watch
```

- Starts Postgres and **app-dev** on [http://localhost:3000](http://localhost:3000) with `next dev` (Turbopack).
- Edits under `src/`, `public/`, and `drizzle/` sync into the container; changes to `next.config.ts`, `postcss.config.mjs`, `server.js`, or `tsconfig.json` sync and restart the dev process; `package.json` / `package-lock.json` changes trigger an image rebuild.
- Do not run `app` and **app-dev** together (both use port 3000). Default `docker compose up --build` still uses the production **app** image for parity with deploys.
- The production `app` service intentionally does **not** publish a host port, which avoids `3000` conflicts when multiple deployments run on the same Docker host behind a reverse proxy (for example Coolify/Traefik).

## Environment variables

Use **`.env.local`** locally, or your host’s secret/env UI in production. Do not commit real secrets.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes (for DB use) | Postgres connection URL, e.g. `postgresql://user:password@host:5432/dbname`. Used by the app and by `npm run db:push` / seed scripts. |
| `AUTH_SECRET` | Yes (for auth) | Secret for NextAuth session signing. Generate e.g. `openssl rand -base64 32`. Changing it invalidates existing sessions. |
| `NEXTAUTH_URL` | Yes (for Recon OAuth and stable redirects) | Public base URL of the app, **no trailing slash** (e.g. `http://localhost:3000` in dev, `https://your-domain.com` in prod). |
| `APP_BASE_URL` | No | Fallback when building absolute URLs if `NEXTAUTH_URL` is unset (Recon Graph OAuth helpers). Prefer `NEXTAUTH_URL`. |
| `NODE_ENV` | Automatic | `development` / `production`; usually set by the runtime. |
| `PORT` | No | HTTP port for `server.js` (default **3000**). `Dockerfile` sets `PORT=3000`. |
| `HOSTNAME` | No | Bind address for Next standalone server (image sets `0.0.0.0`). |

### Web Push

| Variable | Required | Description |
|----------|----------|-------------|
| `VAPID_PUBLIC_KEY` | For push | Web Push public key. Run `npm run generate-vapid-keys` and copy into env. |
| `VAPID_PRIVATE_KEY` | For push | Web Push private key (keep secret). Pair with `VAPID_PUBLIC_KEY`. |
| `VAPID_SUBJECT` | No | VAPID JWT `sub` claim; `mailto:` or `https:` URI. Default `mailto:push@homefinance.app`. Use a real address/domain for strict clients. |

### Scheduled notifications and cron

| Variable | Required | Description |
|----------|----------|-------------|
| `TZ` | No | IANA timezone for in-process scheduler (e.g. `Africa/Johannesburg`). Default **UTC**. |
| `DAILY_NOTIFICATION_HOUR` | No | Hour (0–23) for daily calendar summary push. Default **9**. |
| `CRON_SECRET` | No | If set, `GET /api/cron/daily-calendar-notification` expects this value via `Authorization` or `x-cron-secret`. |

### AI analysis (optional)

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_FREE_API_KEY` | For free tier | Gemini API key for **Free AI**. |
| `GEMINI_API_KEY` | No | Legacy alias: treated like free-tier Gemini if `GEMINI_FREE_API_KEY` is unset. |
| `GEMINI_FREE_MODEL` | No | Gemini model id for free tier (app has a default). |
| `GEMINI_PAID_API_KEY` | For paid Gemini fallback | Used when user selects paid tier and OpenAI is unavailable or not configured. |
| `GEMINI_PAID_MODEL` | No | Gemini model id for paid tier (app has a default). |
| `OPENAI_API_KEY` | For paid OpenAI path | Preferred when user selects **Paid AI** and quota allows. |
| `OPENAI_MODEL` | No | OpenAI model id (app defaults to a small mini model if unset). |

Households need the **AI budget analysis** entitlement (and server API keys). See [docs/feature-access.md](./docs/feature-access.md).

### Recon / Microsoft Graph (optional)

| Variable | Required | Description |
|----------|----------|-------------|
| `GRAPH_OAUTH_CLIENT_ID` | For Recon connect | Entra app **Application (client) ID**. |
| `GRAPH_OAUTH_CLIENT_SECRET` | For Recon connect | Client secret from the app registration. |
| `GRAPH_OAUTH_TENANT` | No | Tenant id or **`common`** for work + personal accounts (default **common**). |
| `MICROSOFT_GRAPH_CLIENT_ID` | No | Alias for `GRAPH_OAUTH_CLIENT_ID`. |
| `MICROSOFT_GRAPH_CLIENT_SECRET` | No | Alias for `GRAPH_OAUTH_CLIENT_SECRET`. |
| `MICROSOFT_GRAPH_TENANT` | No | Alias for `GRAPH_OAUTH_TENANT`. |
| `RECON_TOKEN_ENCRYPTION_KEY` | No | Secret for encrypting stored Graph refresh tokens. If omitted, **`AUTH_SECRET`** is used (must be at least 16 characters). |

Redirect URI in Azure must be `{NEXTAUTH_URL}/api/recon/graph/callback`.

### Seed scripts (`db:seed:users`, `db:seed:minimal`, `db:seed`, `db:fresh`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SEED_HOUSEHOLD_NAME` | No | Demo household name (default `Jordaan household`). |
| `SEED_USER_PASSWORD` | No | Password for both seeded users (default `ChangeMe123!`). |
| `SEED_USER1_EMAIL` | No | First user email (default `matt@homefinance.local`). |
| `SEED_USER2_EMAIL` | No | Second user email (default `sydney@homefinance.local`). |
| `SEED_USER1_NAME` | No | First user display name (default **Matt**). |
| `SEED_USER2_NAME` | No | Second user display name (default **Sydney**). |

`docker-compose.yml` passes `AUTH_SECRET` (default placeholder if unset). See [DEPLOY.md](./DEPLOY.md) for Coolify and production checks.

## Recon and Microsoft Graph (Outlook)

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

Recon-related env vars are listed under [Recon / Microsoft Graph (optional)](#recon--microsoft-graph-optional) in [Environment variables](#environment-variables).

### How authentication works

1. You sign in to Home Finance with **email + password** (existing credentials).
2. Your household must have the **Recon** entitlement (super-admin sets this in `/admin/houses/[id]`).
3. Open **Recon** and choose **Connect Outlook** (or visit `/api/recon/graph/connect` while logged in). The app redirects to Microsoft’s login page.
4. You sign in with your Microsoft account (e.g. `matthew.j@live.com`) and **consent** to Mail.Read.
5. Microsoft redirects back to `/api/recon/graph/callback` with an authorization code. The server exchanges it for tokens, stores an **encrypted refresh token** per user, and redirects you to `/recon`.
6. **Sync** uses the refresh token to obtain short-lived access tokens and calls Graph `GET /me/messages` (read-only). Disconnect removes the stored connection from the database.

**Troubleshooting**: If redirect URI does not match exactly (http vs https, port, path), or `NEXTAUTH_URL` is wrong, OAuth fails. Ensure the app registration redirect URI matches `getGraphRedirectUri()` = `{NEXTAUTH_URL}/api/recon/graph/callback`.

If you see redirects to `https://0.0.0.0:3000/...` in production, your reverse proxy is not providing a correct request origin (Host / `x-forwarded-*` headers) to Next.js, or the app is using the request origin for redirects. Set `NEXTAUTH_URL` correctly and ensure the proxy forwards `x-forwarded-host` and `x-forwarded-proto` (Coolify/Traefik defaults are usually fine). The Recon Graph callback redirects now prefer `NEXTAUTH_URL` over the request origin.

## Database migrations and existing data

- **`npm run db:push`** (used on deploy and in Docker entrypoint) runs **additive** migrations only, tracked in a `schema_migrations` ledger. On first run against an existing database, the ledger is **seeded** from schema detection so migrations are not re-applied. It does **not** `DROP` tables or wipe rows. See [docs/database.md](./docs/database.md).
- **Multi-household** (`drizzle/0027_households_pg.sql`): adds `households`, `users.household_id`, and `household_id` on tenant-owned tables (including **categories**), with backfill for existing rows. For legacy single-household installs, the migration keeps shared lookup data in one default household instead of cloning per user. The migration is idempotent, so a partially applied run resumes cleanly on the next `db:push`. After deploy, users should **re-authenticate** so `householdId` is present on the session. See [docs/multi-household.md](./docs/multi-household.md).
- **Destructive operations** (only when you explicitly want to reset): `npm run db:reset` drops and recreates the public schema (**requires `ALLOW_DB_RESET=1`**); `npm run db:seed` clears application data; `npm run db:fresh` combines reset + seed. Do not use those on production databases you care about.

## Database ERD

The diagram below reflects the **PostgreSQL** schema built from numbered migrations in `drizzle/*_pg.sql` (applied in order by `npm run db:push`). See [docs/database.md](./docs/database.md) for the migration manifest.

**Notes:**

- `income.recurring_income_id` and `expenses.recurring_expense_id` are **not** declared as foreign keys in SQL; they logically reference `recurring_income` / `recurring_expenses`.
- `account_transactions.reference_type` and `reference_id` form a **polymorphic** pointer, not a database-level FK.
- `notes.linked_type` and `notes.linked_id` form a **polymorphic** pointer for user-authored notes on arbitrary domain rows (type keys are app-defined; no FK to targets). See `getNoteRepository()` / `INoteRepository`.
- **Shared list items**: optional notes use `linked_type = 'shared_list_item'` (`NOTE_LINKED_TYPE_SHARED_LIST_ITEM`) and `linked_id = shared_list_items.id`. There is no column on the item row; zero or many note rows per item are allowed. `notes.owner_user_id` scopes who wrote the note. Deleting a list, an item, or completed items removes attached notes via the list repositories.
- `expenses.split_group_id` is a legacy text field; split grouping also uses `split_expense_group_id` → `split_groups`.
- **Tenant column**: Migration `drizzle/0027_households_pg.sql` adds **`household_id`** (FK to `households`) to most domain tables. The diagram lists it on `users`, `categories`, and `split_groups`; other tables follow the same pattern. Child tables without their own `household_id` (`account_transactions`, `shared_list_items`, `sent_reminders`, `mortgage_rate_periods`, `ai_analysis_run_messages`/`_applications`) are isolated by joining their parent.

```mermaid
erDiagram
  households {
    serial id PK
    text name
    timestamptz created_at
  }

  users {
    serial id PK
    text name
    text email UK
    text password_hash
    bigint household_id FK
    timestamptz created_at
    int budget_month_start_day
    bigint primary_account_id FK
    boolean recon_enabled
    boolean owed_to_me_enabled
    boolean ai_use_paid
    boolean ai_enabled
    boolean ai_feature_allowed
    boolean recon_feature_allowed
  }

  categories {
    serial id PK
    bigint household_id FK
    text name
    text group_name
    text icon
    int sort_order
    boolean is_active
    text cost_type
    int default_amount
    timestamptz created_at
  }

  split_groups {
    serial id PK
    bigint household_id FK
    text name
    boolean is_default
    int sort_order
    timestamptz created_at
  }

  budgets {
    serial id PK
    int user_id FK
    int category_id FK
    text month
    int allocated_amount
    timestamptz created_at
    timestamptz updated_at
  }

  budget_transfers {
    serial id PK
    int from_category_id FK
    int to_category_id FK
    text month
    int amount
    int user_id FK
    text reason
    timestamptz created_at
  }

  expenses {
    serial id PK
    int user_id FK
    int category_id FK
    int amount
    text note
    text date
    text month
    timestamptz created_at
    boolean synced
    text split_group_id
    int paid_by_user_id FK
    int split_expense_group_id FK
    int recurring_expense_id
    bigint account_id FK
  }

  income {
    serial id PK
    int user_id FK
    int amount
    text type
    text description
    text date
    text month
    timestamptz created_at
    int recurring_income_id
    bigint account_id FK
  }

  recurring_income {
    serial id PK
    int user_id FK
    int amount
    text type
    text description
    int day_of_month
    timestamptz created_at
  }

  recurring_expenses {
    serial id PK
    int user_id FK
    int category_id FK
    int amount
    text note
    int day_of_month
    timestamptz created_at
  }

  split_allocations {
    serial id PK
    int expense_id FK
    int user_id FK
    int amount
  }

  split_settlements {
    serial id PK
    int payer_user_id FK
    int recipient_user_id FK
    int amount
    text date
    timestamptz created_at
    int expense_id FK
    int income_id FK
    int split_expense_group_id FK
  }

  mortgage_configs {
    serial id PK
    int property_value
    int loan_amount
    double annual_interest_rate
    int loan_term_months
    text start_date
    double target_equity_user_a_pct
    boolean is_active
    timestamptz created_at
  }

  mortgage_user_configs {
    serial id PK
    int mortgage_id FK
    int user_id FK
    int initial_deposit
    double base_split_pct
    int monthly_cap
  }

  mortgage_payments {
    serial id PK
    int mortgage_id FK
    int user_id FK
    text payment_date
    int month_number
    int amount
    int principal_portion
    int interest_portion
    boolean is_extra_payment
    text note
    timestamptz created_at
  }

  mortgage_schedule_snapshots {
    serial id PK
    int mortgage_id FK
    timestamptz generated_at
    text trigger_event
    int trigger_payment_id FK
    text schedule_json
    text projected_payoff_date
    int projected_months
    int monthly_topup
    double user_a_final_equity_pct
    double user_b_final_equity_pct
  }

  calendar_categories {
    serial id PK
    text name UK
    text color
    int sort_order
  }

  calendar_events {
    serial id PK
    int created_by_user_id FK
    text name
    text location
    text date
    text end_date
    text time
    text end_time
    text notes
    text recurrence_type
    int recurrence_day_of_month
    timestamptz created_at
    int reminder_minutes
    int category_id FK
    boolean is_shared
    int priority
  }

  calendar_event_reminders {
    serial id PK
    int event_id FK
    int offset_minutes
    text send_time
    timestamptz created_at
  }

  sent_reminders {
    serial id PK
    int event_id FK
    int reminder_id FK
    text occurrence_date
    timestamptz sent_at
  }

  shared_lists {
    serial id PK
    text name
    int sort_order
    timestamptz created_at
  }

  shared_list_items {
    serial id PK
    int list_id FK
    text label
    int quantity
    boolean completed
    int sort_order
    timestamptz created_at
  }

  push_subscriptions {
    serial id PK
    int user_id FK
    text endpoint UK
    text p256dh
    text auth
    timestamptz created_at
  }

  accounts {
    bigserial id PK
    text name
    text type
    bigint owner_user_id FK
    bigint credit_limit
    timestamptz created_at
  }

  account_transactions {
    bigserial id PK
    bigint account_id FK
    bigint amount
    text transaction_type
    text reference_type
    bigint reference_id
    text note
    timestamptz created_at
  }

  transfers {
    bigserial id PK
    bigint from_account_id FK
    bigint to_account_id FK
    bigint amount
    text note
    timestamptz created_at
  }

  goals {
    bigserial id PK
    bigint owner_user_id FK
    text name
    text type
    bigint target_amount
    bigint monthly_target
    bigint linked_account_id FK
    numeric apr
    text strategy
    timestamptz archived_at
    timestamptz created_at
  }

  goal_contributions {
    bigserial id PK
    bigint goal_id FK
    bigint owner_user_id FK
    bigint account_transaction_id FK
    text kind
    bigint amount
    date effective_date
    text note
    timestamptz created_at
  }

  recon_graph_connections {
    bigserial id PK
    int user_id FK UK
    text refresh_token_encrypted
    text ms_account_email
    timestamptz created_at
    timestamptz updated_at
    timestamptz last_synced_at
  }

  recon_import_items {
    bigserial id PK
    int user_id FK
    text graph_message_id
    text status
    text parse_type
    int amount
    date txn_date
    text vendor
    text merchant_key_normalized
    jsonb matched_expense_ids
    int suggested_category_id FK
    text raw_subject
    text raw_body_preview
    timestamptz created_at
    timestamptz updated_at
  }

  vendor_category_mappings {
    bigserial id PK
    int user_id FK
    text merchant_key_normalized
    int category_id FK
    int use_count
    timestamptz last_used_at
  }

  ai_analysis_runs {
    bigserial id PK
    int user_id FK
    text analysis_type
    text month
    text input_text
    text output_text
    timestamptz created_at
    text prompt_template_id
    int prompt_version
    jsonb input_json
    jsonb output_json
  }

  notes {
    bigserial id PK
    bigint owner_user_id FK
    text linked_type
    bigint linked_id
    text body
    timestamptz created_at
    timestamptz updated_at
  }

  households ||--o{ users : members
  households ||--o{ categories : tenant_categories
  households ||--o{ split_groups : tenant_split_groups

  users ||--o{ budgets : owns
  users ||--o{ expenses : records
  users ||--o{ income : records
  users ||--o{ budget_transfers : owns
  users ||--o{ mortgage_payments : pays
  users ||--o{ mortgage_user_configs : equity_split
  users ||--o{ split_allocations : owed_share
  users ||--o{ split_settlements : payer_user
  users ||--o{ split_settlements : recipient_user
  users ||--o{ recurring_income : templates
  users ||--o{ recurring_expenses : templates
  users ||--o{ calendar_events : creates
  users ||--o{ push_subscriptions : devices
  users ||--o{ accounts : owns
  users ||--o| accounts : primary_account
  users ||--o{ goals : owns
  users ||--o| recon_graph_connections : mailbox
  users ||--o{ recon_import_items : inbox
  users ||--o{ vendor_category_mappings : learns
  users ||--o{ ai_analysis_runs : runs
  users ||--o{ notes : owns_notes

  categories ||--o{ budgets : line
  categories ||--o{ expenses : classifies
  categories ||--o{ budget_transfers : from_cat
  categories ||--o{ budget_transfers : to_cat
  categories ||--o{ recurring_expenses : default_cat
  categories ||--o| recon_import_items : suggested
  categories ||--o{ vendor_category_mappings : maps_to

  split_groups ||--o{ expenses : group
  split_groups ||--o{ split_settlements : group

  expenses ||--o{ split_allocations : splits
  expenses ||--o| split_settlements : optional_link
  income ||--o| split_settlements : optional_link

  mortgage_configs ||--o{ mortgage_payments : amort
  mortgage_configs ||--o{ mortgage_schedule_snapshots : snapshots
  mortgage_configs ||--o{ mortgage_user_configs : parties
  mortgage_payments ||--o| mortgage_schedule_snapshots : trigger

  calendar_categories ||--o{ calendar_events : tag
  calendar_events ||--o{ calendar_event_reminders : reminders
  calendar_events ||--o{ sent_reminders : reminders_sent
  calendar_event_reminders ||--o{ sent_reminders : per_reminder

  shared_lists ||--o{ shared_list_items : contains
  shared_list_items }o--o{ notes : optional_polymorphic_item_notes

  accounts ||--o{ account_transactions : ledger
  accounts ||--o{ transfers : from_acct
  accounts ||--o{ transfers : to_acct
  accounts ||--o| expenses : paid_from
  accounts ||--o| income : deposited_to
  accounts ||--o| goals : linked_savings

  goals ||--o{ goal_contributions : funding
  account_transactions ||--o{ goal_contributions : source_txn

  income }o--|| recurring_income : logical_recurring_no_fk
  expenses }o--|| recurring_expenses : logical_recurring_no_fk
```

## Seed data

Full seed (`npm run db:seed` / `db:fresh`) creates **one** demo household — **Jordaan household** — with Matt (super-admin) and Sydney so tenancy matches a shared-home product demo. The household gets default **categories**, **Default** split group, all five **`household_features`**, `ai_tier` free, and `approval_status` active. Optional env: `SEED_HOUSEHOLD_NAME`, `SEED_USER1_EMAIL`, `SEED_USER2_EMAIL`, `SEED_USER_PASSWORD`, names; see [Seed scripts](#seed-scripts-dbseedusers-dbseedminimal-dbseed-dbfresh). Module layout: `src/lib/db/seed/wipe.ts`, `household.ts`, `finance.ts`, `mortgage.ts`, `calendar.ts`, `lists.ts`, `recon.ts`, `ai.ts` (orchestrated by `src/lib/db/seed.ts`).

- Two users, each tied to a **different** household (no cross-household rows).
- Default categories per household (fixed/variable and default amounts where applicable).
- **3 months** of income and expenses **per user**, scoped to that user’s household.
- **Per-user budget allocations** for the same 3 months and a sample **budget transfer** per user where applicable.
- **Split expenses** only **within** each household (e.g. equal splits between members of the same household). A **Splits** category exists per household for settlement-style lines.
- **Goals**, accounts, and mortgage: sample data for both users in the shared household (see `src/lib/db/seed/`).

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
- **Push notifications (reopen behavior)**: On reopen/resume, the app repairs missing browser subscriptions when permission is still granted, re-subscribes after VAPID key rotation, and re-syncs with the server. **Android installed PWAs** (e.g. Pixel): a background repair runs after SW updates and app resume (common cause of the Settings toggle flipping off while site notifications stay allowed). Filter client logs by `[PushClient]` (`androidPwa: true`); server logs by `[Push]`. `GET /api/push/status` reports server subscription count and VAPID fingerprint.
- **Scheduled notifications**: An in-process scheduler (runs when the server starts) sends:
  - **Daily 9am summary**: If there is at least one calendar event today, a single push at 9am (configurable: `DAILY_NOTIFICATION_HOUR`, default 9; timezone: `TZ`, default UTC) to all users with notifications enabled, listing event name(s) and time(s).
  - **Per-event reminders**: Each event can have several reminders (offset from the event, optional send time for day/week offsets). The in-process scheduler sends a push when that instant is reached. Shared events notify everyone; personal events notify the creator. Set reminders in the calendar event form.
- **Real-time notifications**: When one user adds a **todo** (list item), a **calendar event**, or a **split expense**, the other user receives a push (e.g. "User One added 'Milk' to Shopping", "User One added event 'Dentist' on 2025-03-15").
- **Cron endpoint (optional)**: `GET /api/cron/daily-calendar-notification` can be called externally (e.g. cron job) as a fallback for the daily summary. Protect with `CRON_SECRET` (Authorization header or `x-cron-secret`). See DEPLOY.md.
- **Requirements**: Install works over HTTPS (or localhost). See [DEPLOY.md](./DEPLOY.md) for production deployment.

## Deploy

See [DEPLOY.md](./DEPLOY.md) for deploying to a VPS with Coolify (Docker + Traefik). The guide covers DNS, Dockerfile, **Docker Compose** (app + Postgres with persistent volume), optional Coolify Postgres resource, environment variables, and troubleshooting. If the build fails with **no space left on device** or **ENOSPC** (often during `npm ci` or `COPY ... node_modules`), the build host is out of disk space; see DEPLOY.md for freeing space, pruning Docker, or building the image in CI and pulling it on Coolify.

## Testing

- **Unit tests (offline)**: `npm run test:unit` — no database required. The production **Docker build** runs this before `next build`, so Coolify deploys fail if unit tests fail.
- **Integration tests**: `npm run test:integration` — requires `DATABASE_URL` and a seeded DB (`npm run db:fresh`). See `src/__tests__/integration/` (API/DB smoke tests and **mortgage interest recalc** through `MortgageService` + Postgres).
- **Watch mode**: `npm run test:watch`
- Coverage includes currency, date utils, mortgage engine, split/settlement balance math, credit edge cases, finance service parity checks in `src/tests/`, and high-volume **drift** tests in `src/tests/transaction-drift.test.ts` (long mortgage schedules, hundreds of split/settlement cycles, 10k ledger postings).
- **Design**: Pure logic in `src/lib/services/finance/*`; services use repository interfaces for testability. See [docs/design-system.md](./docs/design-system.md) and [docs/push-notifications.md](./docs/push-notifications.md).

## Scripts

- `npm run dev` – Start dev server (Turbopack)
- `npm run build` / `npm run start` – Production build and start
- `npm run db:push` – Apply pending migrations (ledger-backed; safe on production). See [docs/database.md](./docs/database.md).
- `npm run db:reset` – Recreate DB from scratch (requires `ALLOW_DB_RESET=1`). Then run push (and optionally seed).
- `npm run db:seed:users` – Create or update only the two env-driven login users and create households for them if needed
- `npm run db:seed:minimal` – Seed an empty DB with one household, two users, default categories, and default split group
- `npm run db:seed` – Clear all data, then seed one fully populated Jordaan household (finance, splits, calendar, lists, recon queue, AI sample, mortgage, goals, recurring)
- `npm run db:fresh` – Reset DB then seed (recreate from scratch and seed in one go)
- `npm run generate-pwa-icons` – Generate PWA icons into `public/icons/` (requires `sharp`). Run once or when changing app icon.
- `npm run generate-vapid-keys` – Print VAPID key pair for Web Push. Add the two lines to your env (e.g. `.env.local`) so push notifications work.
- `npm run test` / `npm run test:unit` – Run offline unit tests (Vitest)
- `npm run test:integration` – Run DB integration tests (requires `DATABASE_URL`)
- `npm run test:watch` – Run unit tests in watch mode
- `npm run start:server` – Start the custom Node server (initDb + persist loop); use for cPanel. See DEPLOY.md.

The app uses **Postgres** only (via `pg`). `DATABASE_URL` is required. Repositories use a small abstraction (`run`, `get`, `all`, `lastInsertId`). Schema is in `drizzle/0000_init_pg.sql` and numbered migrations; apply with `db:push`.

## Troubleshooting

- **Module type warning**: If you see `MODULE_TYPELESS_PACKAGE_JSON` when running `tsx` scripts (e.g. `db:push`, `db:seed`), the project is already set up with `"type": "module"` in `package.json` so Node treats the project as ESM. If the warning persists, ensure you are on a recent Node 18+ and that no other tool is forcing CommonJS for this package.

- **DEP0169 `url.parse()` deprecation**: The custom server (`server.js`) uses the WHATWG URL API instead of `url.parse()`. If you still see this warning, it is coming from a dependency (e.g. next-auth); upgrade dependencies when newer versions that use the WHATWG API are available.

- **Rayon thread pool panic** (`The global thread pool has not been initialized`, `Resource temporarily unavailable`): This comes from a Rust-based component (often in the Node/Next toolchain, e.g. SWC) when the process cannot create enough threads. Common causes: low memory or thread limits in containers, or many concurrent Node/tsx processes. Mitigations:
  - Run DB scripts one at a time (e.g. do not run `db:reset` and `db:seed` in parallel).
  - In Docker or cPanel, increase memory/CPU limits if possible.
  - On Linux, check `ulimit -u` (max user processes) and raise if needed; avoid running several heavy Node processes at once.
