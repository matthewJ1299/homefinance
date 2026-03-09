# Changelog

## [Unreleased]

### Added

- **PWA push notifications**: Web Push support so the app can send notifications when in the background or closed. The service worker handles `push` and `notificationclick` (opens the app or a given URL). Users enable notifications in **Settings** (Push notifications section): enable, send a test, or disable. Backend stores subscriptions per user (table `push_subscriptions`); VAPID keys are required (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`). Generate keys with `npm run generate-vapid-keys` and add to env. API: `GET /api/push/vapid-public`, `POST /api/push/subscribe`, `POST /api/push/unsubscribe`, `POST /api/push/send` (test or server-triggered). Requires HTTPS and a supporting browser.
- **Daily calendar notification**: If there is at least one calendar event today, a push is sent at 10am to all users who have push enabled. The notification says there is an upcoming event and lists the event name(s) and time(s). Schedule the cron endpoint `GET /api/cron/daily-calendar-notification` for 10am daily (e.g. `0 10 * * *` with your timezone). Protect with `CRON_SECRET`: send `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>`. If `CRON_SECRET` is not set, the route still runs (for testing); set it in production.

### Changed

- **Lists**: Navigating to Lists now shows the default list (first list by sort order) directly. If there are no lists, the page shows a message with a link to Settings to add one. Add list and manage lists (create/delete) are in **Settings** under **Shared lists**. The list detail page includes a list switcher (links to other lists) when you have more than one list.
- **Calendar**: Toolbar (prev/next, Today, view switcher) uses smaller buttons and label on viewports up to 768px to reduce space on mobile.

### Added

- **Dashboard calendar tile**: A small tile on the dashboard shows today's calendar events (time and name). If there are none, it shows "No events today". The tile links to the Calendar page.
- **Quick-add FAB**: Floating action button (plus icon) at the bottom-left on all app screens. Click to open a menu: **Expense**, **List item**, or **Calendar event**. Choosing an option opens the relevant modal (expense quick-add with category, list item with list picker and label/quantity, or new calendar event form). Data is added and the current page refreshes; calendar events invalidate the calendar query so the calendar view updates when open.
- **Shared lists**: Household-wide lists that all authenticated users can access. Create and delete multiple lists; add items with label and quantity (plus/minus to change quantity). Click an item to mark it complete (strikethrough and move to bottom). Delete individual items or use "Delete all completed" per list. Lists appear in the main nav under "Lists".
- **Docker**: Entrypoint now runs `db:push` when `DATABASE_URL` is set so pending Postgres migrations (e.g. shared_lists) are applied on container start.
- **Mobile nav**: Bottom bar reduced to 4 icons (Home, Calendar, Lists, Summary). Home links to Dashboard. Hamburger menu shows Dashboard, Expenses, Splits, Budget, Mortgage, and Settings. Desktop sidebar unchanged (full list). Hamburger panel z-index raised so it appears above content.

