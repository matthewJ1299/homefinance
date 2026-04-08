# Changelog

## [Unreleased]

### Added

- **Recon (`/recon`)**: Bank email reconciliation via **Microsoft Graph** (OAuth). Connect Outlook, sync recent messages, parse two configurable bank email templates (`type_a` / `type_b`), flag **possible duplicates** when an expense exists on the same calendar day with the same amount, suggest categories from **vendor_category_mappings**, and **manually** accept as duplicate, accept and add (expense via `ExpenseService`), or ignore. New tables: `recon_graph_connections`, `recon_import_items`, `vendor_category_mappings` (migration `0013_recon_pg.sql`). APIs under `/api/recon/*`. Nav: **Recon** in desktop/hamburger. See [docs/recon.md](./docs/recon.md) and README (Graph setup).
- **Recon approval split**: When approving a recon item you can now tick **Split 50/50** so **Accept and add** creates a split expense (equal split) using the existing Splits feature.

### Changed

- **Dashboard quick add (categories)**: The **Quick add expense** tile uses the same **`CategoryPicker`** as the `/add` expense flow: **Most used** (from usage stats), **Show more** for **Variable** / **Fixed** groups. Pill labels show **category names only** (no budget amounts on the tile); overspent styling and the below-the-picker warning still use budget data when available.

### Fixed

- **Recon Graph OAuth (production)**: Added PKCE to the Microsoft Graph authorization-code flow and made the callback redirect prefer `NEXTAUTH_URL` over the request origin to avoid invalid redirects like `0.0.0.0` behind proxies.

- **Budget summary (YNAB-style Option 2)**: Budget overview now uses `toBeAllocated = (totalIncome - totalAllocated) + rolloverAdjustment`, where `rolloverAdjustment` is the negative of prior-month cash overspending (combined-safe: category negatives first, top-level gap fallback). The summary and banner now clearly show **to allocate**, **fully allocated**, or **over allocated** states, including negative values.
- **Dashboard greeting**: Home greeting and the date line use **UTC+2** (`Africa/Johannesburg`), not the device timezone: **Good morning**, **Good afternoon**, or **Good evening** by that clock.
- **Split exact-amount UX**: Exact split inputs (dashboard quick add, add flow modal, edit dialog) now show a live helper line for **remaining to allocate**, **fully allocated**, or **over allocated** so users can balance shares before saving.
- **Push settings lifecycle (Android/PWA reopen)**: Push settings now re-check permission/subscription on visibility/focus/pageshow and re-sync existing subscriptions to the server, reducing cases where users had to disable/re-enable notifications after reopening the app.

- **Add hub / quick add navigation**: After saving from `/add` or the floating quick-add menu, **expense** navigates to **Dashboard**, **list item** to **`/lists/[id]`** for the list you chose, and **calendar event** to **`/calendar`**. `AddListItemDialog`’s `onSuccess` now receives `{ listId }`.

- **Optimistic UI + toasts for all saves**: UI updates immediately for create/update/delete operations, then shows a success toast once the database write completes. On failure, a failure toast is shown and the UI rolls back the optimistic change.

- **Add expense quick flow (`/add` and `QuickAddForm`)**: The **Choose category** step shows the **amount** you are logging (read-only summary). The Add hub can pass a **quick line** (e.g. `89.50 lunch`) so amount and note pre-fill when you continue. Applies anywhere `QuickAddForm` is used (same inner step).

- **Dashboard quick add (split)**: Checking **Split with partner** now expands the same options as elsewhere: **split group** (when you have groups), **I paid, split equally**, **I am owed the full amount**, or **Split by exact amount** with my / other share fields.

### Fixed

- **Recurring month population with budget-month ranges**: When a user uses a custom budget-month start day (for example the 25th), recurring income and expenses now populate into the correct date inside that budget month window. Items with day-of-month before the budget start day are now created in the following calendar month so they appear in the intended upcoming budget period.

- **Dashboard quick add vs Recent expenses**: Quick add now uses the same **primary account** and **budget-month date** as the server uses for the **Recent expenses** list (primary from `AccountService`, date clamped into the visible budget month when you are not viewing the current period). Previously, the client could save before `/api/accounts` finished (no `account_id`) while Recent expenses filtered by primary account, so new rows appeared on **Expenses** but not under Quick add; month mismatch when `?month=` differed from calendar today had the same symptom.

- **Dev server without DATABASE_URL**: The Node instrumentation hook no longer throws at startup when `DATABASE_URL` is unset; it logs a warning and skips DB init, the persist loop, and the in-process notification scheduler. The app still requires Postgres for real use—configure `DATABASE_URL` before hitting DB-backed routes.

### Changed

- **Dashboard recent expenses**: The home **Recent expenses** list uses the user’s **primary account** (Settings > Accounts). If none is set but multiple accounts exist, the app picks the same default as before (oldest bank, else oldest account). **Only account**: that account is always primary automatically. The `account` query parameter on `/dashboard` does not affect this list. If the user has no accounts yet, behavior is unchanged (all expenses for the month).

- **Mobile hamburger menu**: Uses the same links as the desktop sidebar (`fullNavItems`): Calendar, Add, Lists, Summary, and the rest of the finance pages, not the shorter subset used before.
- **Settings > Lists**: **List items** subsection lets you pick any list and add checklist rows, adjust quantity, mark complete, delete items, or delete all completed—same behavior as `/lists/[id]` without leaving Settings.

### Fixed

- **Goals projection typecheck**: Credit horizon `useEffect` in `goal-projection-section` used `[detail.goal.id]` in the dependency array while `detail` can be null; dependency is now `detail?.goal.id` so `next build` type-check passes.

- **Expenses page account filter**: Choosing an account in the **Account** dropdown now correctly limits the expense list to rows linked to that account. Postgres `BIGINT` `account_id` values were returned as strings from the driver, so strict comparison with the numeric selection failed; expense rows now normalize `accountId` when mapping from the database.
- **Expense/income `accountId` (Zod)**: Create/update validators coerce numeric strings for `accountId` so server actions and APIs accept JSON shapes where BIGINT ids arrive as strings (fixes `/add` and similar flows). Account repository rows normalize `id` and `credit_limit` from Postgres.

### Changed

- **`GET /api/accounts` order**: Returns the **primary** account first, then other accounts sorted by name (Settings list matches this order).
- **Quick add (expense and income)**: With at least one account, there is no **None** option; default selection is the primary account. Expense quick add waits for the accounts request before enabling **Add** so the default applies.

### Added

- **Primary account**: `users.primary_account_id` (nullable FK to `accounts`, `ON DELETE SET NULL`). **Settings > Accounts** shows a **Primary** badge, **Set as primary** when you have more than one account, and a note when you have only one (it is always primary). `GET /api/accounts` returns `primaryAccountId`; `PUT /api/accounts/primary` with `{ "accountId": number }` sets it. Coherence is enforced in `AccountService` (single account always primary; invalid primary after deletes is repaired). Postgres migration `0012_primary_account_pg.sql`.

- **Goals expanded page**: `/goals` is a single focused goal view with five sections (Overview, Progress and monthly tracking, Activity from the ledger, live Projection, Controls). Activity rows require a real `account_transaction_id`; projections are computed only via API and not stored. Credit goals compare Avalanche, Snowball, and Target date payments live (`POST /api/goals/[id]/projection-scenario`); full detail and paginated activity use `GET /api/goals/[id]/detail`. See [docs/goals.md](./docs/goals.md).
- **Credit projection months slider**: On the Goals projection card, a **max payoff months** slider (1–120) shows the minimum payment for that horizon, total interest, comparison to your plan payment, and tightening by one month (`buildHorizonSliderScenario` + `horizonMonths` on `POST /api/goals/[id]/projection-scenario`).

- **Export transactions (Settings)**: **Export transactions** on the Settings page downloads a CSV of all **income** and **expense** rows for the signed-in user via `GET /api/export/transactions`. Columns include kind, dates, budget month, amounts (minor units plus a decimal column), category or income type, notes, optional account and split fields, and created timestamp. UTF-8 with BOM for Excel.

- **Budget month start day (pay-cycle months)**: Under **Settings**, **Budget month range** lets each user choose which calendar day the budget month begins (1-28). Default `1` is a normal calendar month. Example: `25` means the budget period is the 25th through the 24th of the following month (inclusive), so salary on the 25th opens the new budget month. Budget, income, expenses, summary, goals summary/progress, dashboard labels, and month navigation use this range; new/edited transactions get a `yyyy-MM` budget key from the transaction date and this rule. Postgres migration `0011_budget_month_start_day_pg.sql` on `users.budget_month_start_day` (applied by `db:push` when the column is missing).
- **Calendar multi-day events**: Optional **end date** (`calendar_events.end_date`, inclusive) for non-recurring events. Month view shows a **spanning pill** across the week row under the affected days; day schedule and dashboard tiles show the date range. Recurring templates still use a single day per occurrence (end date is cleared when recurrence is not “none”). Postgres migration `0010_calendar_event_end_date_pg.sql` (applied by `db:push` when `end_date` is missing).
- **Add hub (`/add`)**: Dedicated **Create new** screen (task, event, expense cards + Quick add) opened from the **center Add** control in the mobile bottom bar. List-item creation uses shared `AddListItemDialog` (shared/personal scope).
- **Budget page (mobile mockup)**: Summary card with larger donut + income/expense/balance rows; **Spending by category** tile (dots + progress bars); **Recent transactions** (reuses expense list styling); **Categories and allocations** section unchanged below the sticky allocate strip.
- **Lists overview**: `/lists` shows **My lists** with filter chips (All + per list), per-list progress and items, and **Open** to the list detail page (no auto-redirect to the first list only).
- **Dashboard stats strip**: Three tappable cards (open list tasks, today’s event count, month balance) under the greeting.
- **Docker Compose Watch**: `docker-compose.yml` adds an **app-dev** service (profile `watch`, `Dockerfile.dev`) with `develop.watch` rules: sync `src/`, `public/`, `drizzle/`; sync+restart for `next.config.ts`, `postcss.config.mjs`, `server.js`, `tsconfig.json`; rebuild on lockfile changes. Run `docker compose --profile watch up db app-dev --watch` for local dev with hot reload. Default `docker compose up` still uses production **app**.

### Changed

- **Mobile bottom navigation**: Layout is **Home, Calendar, [Add], Lists, Budget** (center Add navigates to `/add`; last slot is Budget instead of Summary). **Summary** remains in the hamburger / desktop sidebar. Bar uses a floating center pill, labels on mobile, and extra bottom padding for content.
- **App layout**: Removed per-request prefetch of categories/lists/split groups for the old nav quick-add menu; `/add` loads its own data.
- **Calendar UI**: Tighter mockup-style month cells (rounded-2xl, borderless transparent cells, light hover tint; selected/today state only on the day-number circle), larger header month title, schedule cards with clearer title/notes spacing and shadows. Multi-day spanning bars: no border, ring, or shadow on the bar. Month grid: denser week rows (shorter cells, tighter vertical gaps), `w-full` grids and day buttons so columns use the full card width, slightly reduced horizontal padding in the grid frame.
- **Lists list rows**: Check-circle toggle, date chip, compact quantity controls, icon delete, optional chevron to list detail.
- **Quick-add trigger** (`QuickAddTrigger`): Document-level **pointerdown** outside handler excludes the trigger element (fixes tap race where the menu closed then reopened). Refactored list-item dialog into `src/components/shared-lists/add-list-item-dialog.tsx` for reuse.

### Added

- **Calendar events (richer model + UI)**: Events support optional **end time**, **category** (lookup table `calendar_categories` with color hex for dots and schedule bars), **shared vs personal** visibility (`is_shared`: household vs creator-only), and **priority** (1-4). Month grid shows colored dots per category; day schedule uses a mockup-style layout (start/end times, vertical color bar, card, location pin, shared/personal icon). **GET /api/calendar/categories** lists categories. List and notifications respect visibility: API and dashboard show shared events plus the current user’s personal events; daily summary push is per-user; per-event reminders go to all users for shared events and only to the creator for personal events. Real-time “new event” push to the partner runs only for shared events. Postgres migration `0009_calendar_categories_and_event_fields_pg.sql` (applied by `db:push` when `calendar_events.end_time` is missing).
- **Accounts and Transfers**: Financial accounts system for tracking bank balances, savings, and credit. Create accounts (Bank, Savings, Credit) under **Settings** > **Accounts**. Link income and expenses to accounts when adding them; balances are computed from a ledger (`account_transactions`). Use **Transfer Money** from the dashboard Accounts tile or Settings > Accounts to move funds between accounts (e.g. bank to savings, pay down credit). Credit accounts show balance, limit, and available credit. All financial movement flows through `account_transactions`; balances are never stored directly. API: `GET/POST /api/accounts`, `GET /api/accounts/[id]/balance`, `GET /api/accounts/[id]/transactions`, `POST /api/transfers`.
- **Goals (Intent) + Contributions (Bridge)**: Added a Goals system to track intent separately from reality. Goals can be **Savings** (target + monthly target) or **Credit** (linked credit account + monthly payment target + optional APR). Contributions are *not expenses*: they are recorded as account movements (transfers/adjustments in `account_transactions`) and linked to goals via `goal_contributions`. Dashboard tiles show savings progress, monthly compliance, projected completion month, credit payoff estimate, and alerts when behind. New page: **Goals** (`/goals`). API: `GET/POST /api/goals`, `GET/PATCH/DELETE /api/goals/[id]`, actions `POST /api/goals/[id]/contribute|withdraw|pay|interest`, queries `GET /api/goals/summary`, `GET /api/goals/[id]/progress` (alias: `/projection`). Deterministic math drives projections/strategies; AI remains advisory only.
- **Dashboard Accounts Summary tile**: Shows totals by type (Bank, Savings, Credit) and Net, with a link to Transfer Money.
- **Dashboard account filter**: A dropdown on the dashboard (next to the month navigator) lets you filter by account: default is "All accounts"; you can switch to a specific account. Recent expenses and Income this month are then limited to that account. Pagination and month navigation preserve the selected account.
- **Budget-expense integration**: After adding an expense (quick-add or dialog), a toast notification shows how much budget remains in that category for the month. If the category is over budget, the toast is a warning with a "Go to Budget" action. Implemented with Sonner; only used for this notification (inline messages elsewhere unchanged).
- **Dashboard over-budget tile**: A warning card appears on the dashboard when any category is over budget for the selected month, listing each overspent category and amount over; the card links to the Budget page.
- **Category picker budget hints**: On the dashboard quick-add, the category picker shows remaining budget per category (e.g. "Groceries (R450 left)"). Overspent categories are shown in red with the amount over.
- **AI expense analysis (Gemini)**: Optional AI module for monthly expense analysis. Set `GEMINI_API_KEY` in the environment to enable. Uses **Gemini 2.5 Pro** (best free-tier model; may be slower). On the dashboard, an "Analyze spending" button sends the current month's budget summary and returns a short analysis (spending patterns, budget advice, anomalies). Rate-limited in-memory (5 calls per user per hour). If the key is not set, the button is hidden.
- **Shared UI primitives**: Added `AvatarCircle` and `SectionHeader` components to support the new UI mockups.
- **Home dashboard redesign (mockups)**: Updated the dashboard layout to match the provided “Good morning” Home mockup (greeting bar, split balance banner, over budget + today/next cards, inline quick add, and recent expenses card).
- **Calendar UI (mockups)**: Replaced the month/week/day calendar UI with a custom month grid + schedule list. Clicking a day opens the add-event dialog prefilled with that day.
- **Budget UI (mockups)**: Added a total budget donut chart, updated allocation progress bars to show `Spent/Allocated` with green/red states, and made allocation tiles expandable to reveal that month&apos;s transactions per category.

### Changed

- **Postgres-only database**: `DATABASE_URL` is now required. Use Postgres for all deployments.
- **Header (top bar)**: Order is now name, theme toggle, hamburger (mobile). Sign out is moved into the hamburger slide-out menu at the bottom.
- **Populate this month**: The "Populate this month" button is moved to the bottom of the dashboard (below the Income section).
- **Android PWA icon**: The maskable icon now uses a full green background (matching iOS) with the house graphic in the 80% safe zone, so Android adaptive icons match the iOS home-screen appearance. Regenerate with `npm run generate-pwa-icons`.
- **Dark UI styling**: Tuned dark theme colors (background/card/border/muted) to better match the provided mockups.

### Added (previous)

- **PWA install on iOS (standalone mode)**: Explicit Apple meta tags (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`) and `<link rel="manifest" href="/manifest.json">` in the root layout so iOS Safari installs the app as a standalone PWA instead of a bookmark. Static `public/manifest.json` replaces the dynamic manifest route. iOS splash screen images (apple-touch-startup-image) for common iPhone and iPad sizes are generated by `npm run generate-pwa-icons` and linked in the layout for a branded launch screen.

- **PWA push notifications**: Web Push support so the app can send notifications when in the background or closed. The service worker handles `push` and `notificationclick` (opens the app or a given URL). Users enable notifications in **Settings** (Push notifications section): enable, send a test, or disable. Backend stores subscriptions per user (table `push_subscriptions`); VAPID keys are required (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`). Generate keys with `npm run generate-vapid-keys` and add to env. API: `GET /api/push/vapid-public`, `POST /api/push/subscribe`, `POST /api/push/unsubscribe`, `POST /api/push/send` (test or server-triggered). Requires HTTPS and a supporting browser (iOS 16.4+ when installed as PWA).
- **Daily calendar notification (9am)**: If there is at least one calendar event today, a push is sent at 9am (configurable via `DAILY_NOTIFICATION_HOUR` and `TZ`) to all users who have push enabled. The notification lists the event name(s) and time(s). The in-process scheduler (`NotificationScheduler` in `instrumentation.ts`) runs this automatically; the endpoint `GET /api/cron/daily-calendar-notification` remains as a manual/fallback trigger. Protect with `CRON_SECRET` when calling the endpoint.
- **Per-event calendar reminders**: Calendar events can have a reminder (None, At event time, 5/10/15/30 min, 1 hour, 2 hours, 1 day before). The in-process scheduler runs every minute and sends a push to all users when an event's reminder time is reached. Sent reminders are stored in `sent_reminders` to avoid duplicates (e.g. recurring events).
- **Real-time push notifications**: When one user creates a todo (list item), a calendar event, or a split expense, the other user receives a push notification (e.g. "User One added 'Milk' to Shopping", "User One added event 'Dentist' on 2025-03-15", "User One added a split expense (R250)"). Notifications are fire-and-forget; failures do not affect the primary operation.
- **NotificationService**: Centralized server-side service (`src/lib/services/notification.service.ts`) for sending push notifications: `sendToUser`, `sendToAllExcept`, `sendToAll`. Handles VAPID configuration and removes stale subscriptions (410 Gone) on send. Used by the push send route, cron endpoint, scheduler, and real-time triggers.

### Changed

- **PWA install prompt (Gym-style)**: Install prompt now matches the pattern used in the Gym app for the "official" install notification on iOS: (1) iOS Safari only (not Chrome on iOS) via `isIOSSafari()`, (2) prompt appears after a 3-second delay, (3) two-step UI: compact bar with "How to Install" then expandable step-by-step instructions (Share, Add to Home Screen, Add), (4) dismiss uses sessionStorage so the prompt can show again in a new session. Added `src/lib/utils/device-detection.ts` (isIOS, isStandalone, isIOSSafari). On non-iOS, accepting install sets localStorage `pwa-installed` so the prompt is not shown again.

- **PWA manifest (iOS)**: Manifest aligned with iOS-friendly setup: added 180x180 icon (used for iOS home screen via layout apple link), orientation set to `portrait-primary`, and shortcuts for Dashboard, Expenses, and Summary. Layout apple icon now points to `icon-180x180.png`. Regenerate icons with `npm run generate-pwa-icons` to create the new 180x180 asset.

- **PWA manifest**: Switched from dynamic `manifest.ts` to static `public/manifest.json` for reliable iOS PWA recognition. Layout no longer exports `manifest` in metadata; the manifest is linked explicitly in `<head>`.
- **db:push**: Applies migration 0006 (calendar_reminders): adds `reminder_minutes` to `calendar_events` and creates `sent_reminders` table.
- **Lists**: Navigating to Lists now shows the default list (first list by sort order) directly. If there are no lists, the page shows a message with a link to Settings to add one. Add list and manage lists (create/delete) are in **Settings** under **Shared lists**. The list detail page includes a list switcher (links to other lists) when you have more than one list.
- **Calendar**: Toolbar (prev/next, Today, view switcher) uses smaller buttons and label on viewports up to 768px to reduce space on mobile.

### Added

- **Dashboard calendar tile**: A small tile on the dashboard shows today's calendar events (time and name). If there are none, it shows "No events today". The tile links to the Calendar page.
- **Quick-add FAB**: Floating action button (plus icon) at the bottom-left on all app screens. Click to open a menu: **Expense**, **List item**, or **Calendar event**. Choosing an option opens the relevant modal (expense quick-add with category, list item with list picker and label/quantity, or new calendar event form). Data is added and the current page refreshes; calendar events invalidate the calendar query so the calendar view updates when open.
- **Shared lists**: Household-wide lists that all authenticated users can access. Create and delete multiple lists; add items with label and quantity (plus/minus to change quantity). Click an item to mark it complete (strikethrough and move to bottom). Delete individual items or use "Delete all completed" per list. Lists appear in the main nav under "Lists".
- **Docker**: Entrypoint now runs `db:push` when `DATABASE_URL` is set so pending Postgres migrations (e.g. shared_lists) are applied on container start.
- **Mobile nav**: Bottom bar reduced to 4 icons (Home, Calendar, Lists, Summary). Home links to Dashboard. Hamburger menu shows Dashboard, Expenses, Splits, Budget, Mortgage, and Settings. Desktop sidebar unchanged (full list). Hamburger panel z-index raised so it appears above content.

