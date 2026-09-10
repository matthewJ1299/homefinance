# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                 # Next dev server (Turbopack) on :3000
npm run build && npm start   # production build / serve
npm run start:server         # custom Node server (server.js via tsx) — cPanel/DB-init-before-listen path
npm run lint                 # next lint (eslint-config-next / core-web-vitals)

npm run test                 # = test:unit
npm run test:unit            # Vitest, offline, no DB. Runs src/**/*.test.ts EXCEPT src/__tests__/integration/**
npm run test:integration     # Vitest, needs DATABASE_URL + seeded DB (run db:fresh first)
npm run test:e2e             # Playwright E2E, headed Chromium by default — see docs/e2e-playwright.md
npm run test:e2e:ui          # Playwright UI mode
npm run test:watch           # vitest watch

# Run a single unit test file / name:
npx vitest run src/tests/finance.test.ts
npx vitest run -t "settles split balance"

npm run db:push              # apply pending migrations (ledger-backed, additive-only, safe on prod)
npm run db:seed              # WIPES app data, then seeds users/categories/3 months of data
npm run db:reset             # DESTRUCTIVE: drops & recreates public schema (needs ALLOW_DB_RESET=1), then push + seed-categories
npm run db:fresh             # db:reset + db:seed  (dev only)
npm run generate-vapid-keys  # print VAPID pair for Web Push
npm run generate-pwa-icons   # regenerate public/icons/*
```

The Docker production build runs `test:unit` before `next build`, so a failing unit test fails the deploy.

Local minimum env (put in `.env.local`, auto-loaded by Next): `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL` (no trailing slash). Optional: `DB_LOG=off|summary|verbose` (query logging; production defaults to `summary`, which omits parameter values because they are personal financial data), `PGPOOL_MAX` / `PG_STATEMENT_TIMEOUT_MS` (pool tuning), `PGSSL=require`, `CRON_SECRET` (required — the cron endpoint returns 503 without it). Without `DATABASE_URL` the server still boots but skips DB init / scheduler and DB-backed routes fail. Full env matrix is in `README.md`.

## Architecture

Next.js 15 App Router + React 19, TypeScript strict, Tailwind v4, shadcn/ui (new-york style). Path alias `@/*` → `src/*`. Package is ESM (`"type": "module"`); TS scripts run via `tsx`.

### Layered data flow — do not skip layers

```
Client component ──► Server Action (src/lib/actions/*.actions.ts)  ──┐
                 └─► Route Handler (src/app/api/**/route.ts)        ──┤
                                                                     ▼
                                          Service (src/lib/services/*.service.ts)
                                                                     ▼
                                    Repository interface (src/lib/repositories/interfaces/*)
                                                                     ▼
                                    SQL repository impl (src/lib/repositories/sql/*)
                                                                     ▼
                                    src/lib/db  →  run/get/all/lastInsertId  →  pg (Postgres only)
```

- **Actions vs routes:** mutations from the UI go through server actions; API route handlers exist mainly for cron, push, export, recon OAuth, and calendar (React Query). Both entry points do `auth()` → `setRequestContext({userId,userName})` → validate with a Zod schema from `src/lib/validators/` → call a service. Actions return `{ success: false, error }` rather than throwing, and call `revalidatePath`.
- **Wrap actions in `authedAction`** (`src/lib/actions/_shared/authed-action.ts`): it does auth, request context, and the never-throw contract in one place, and keeps raw Postgres text out of the browser in production. A bare `try`-less action breaks the optimistic-rollback contract in `docs/mutations-ux.md`.
- **Multi-repository writes go in `withTransaction`**, in the service that owns the operation. Compensating deletes in a `catch` are not a substitute — a failed compensation leaves half a record and says nothing.
- **Repositories** are obtained via `getXRepository()` factories in `src/lib/repositories/index.ts` (lazy singletons typed to the interface). Services take repos as constructor defaults (`constructor(private repo = getExpenseRepository())`) so tests inject fakes. Never `import` a `sql/*.repository` directly outside the factory.
- **`src/lib/db/index.ts`** is the only DB surface: `run`, `get`, `all`, `lastInsertId`, `withTransaction`, plus `initDb` / `startPersistLoop`. Every call is logged with the request-context user (`[DB] …`). There is **no ORM at runtime** — the `drizzle/` folder is just hand-written SQL migration files.
- **Pure finance logic** lives in `src/lib/services/finance/*` (accounts, credit, goals, mortgage, projections, mortgage-rate-periods) and `mortgage-calculator.ts` — no I/O, heavily unit-tested including drift/parity tests in `src/tests/`. Keep money math here, not in repositories or components.

### Cross-cutting conventions

- **Money is integer minor units (cents), currency ZAR.** Convert at the edge with `toMinorUnits` / `fromMinorUnits` / `formatRand` from `src/lib/utils/currency.ts`. DB columns are `INTEGER` or `BIGINT`; `src/lib/db/coerce-bigint.ts` handles `pg` returning bigints as strings.
- **Budget month ≠ calendar month.** Each user has `budget_month_start_day` (1–28). Always derive month windows via `src/lib/utils/budget-month-for-user.ts` (`budgetMonthKeyForUser`, `getBudgetPeriodForUserMonth`) and pass the period down to repositories — don't filter by raw `date` prefix.
- **Optimistic UI contract** (`docs/mutations-ux.md`): UI applies the change immediately, success toast + background `router.refresh()` / query invalidation, failure toast + explicit rollback. Server-list pages mirror RSC props into local state; Calendar uses React Query cache.
- **Timezone:** user-facing "today"/greeting uses Africa/Johannesburg (UTC+2), not the device clock. Date helpers in `src/lib/utils/date.ts`.
- **Feature gating is per household, with no per-user layer.** Entitlements live in `household_features` (migration 0030) and are set only by a super-admin in `/admin`; `getAuthState` resolves them per request and `hasFeature` / `requireFeature` (`src/lib/features/access.ts`) read them synchronously. Add a feature by appending to `FEATURE_KEYS` in `src/lib/features/registry.ts` — no migration, no nav change. Some features also need server config (`ai_budget_analysis` needs API keys, `recon` needs the Graph OAuth app); `src/lib/services/feature-access.service.ts` is where entitlement and server config are combined. There is **no end-user Settings toggle**. The `users.ai_feature_allowed` / `recon_feature_allowed` / `ai_enabled` / `recon_enabled` columns are the superseded pre-0030 model, still in the schema and read by nothing. See `docs/feature-access.md`.
- **The ledger is the balance.** `account_transactions` has no stored balance column; the balance is `SUM(amount)`. Since migration 0049 it carries typed `expense_id`/`income_id`/`transfer_id` foreign keys with `ON DELETE CASCADE`, so a ledger row cannot outlive its source. The legacy `reference_type`/`reference_id` pair is still written alongside and a CHECK keeps the two in step. `notes.linked_type/linked_id` is still polymorphic with no FK.
- **Tenancy is enforced by the schema, not just the repository.** Every tenant-scoped foreign key is declared on `(fk_column, household_id)` against the parent's `UNIQUE (id, household_id)` (migration 0048), which makes a cross-tenant reference unrepresentable. `requireHouseholdId()` is still the read-path guard; the FK is what catches a write that forgets. Give a new tenant-scoped FK the same treatment — and note `ON DELETE SET NULL` needs the Postgres 15+ column list (`SET NULL (account_id)`), or it tries to null `household_id` too. The one deliberate exception is `household_features.granted_by_user_id`, which points at the granting super-admin in another household.
- **The database knows its enums.** Enum columns, ISO date/month formats and ranges all carry CHECK constraints (0050). Adding a value to a TypeScript union means adding it to the constraint in the same change — and the allowed set is the union of what the code writes and what existing rows hold, which are not always the same. Dry-run any new constraint against real data before shipping it: use `[0-9]` not `\d` in a regex CHECK (`\d` matches nothing here), and check both sources before writing an `IN` list.
- **Behaviour never keys off a category's display name.** Categories are user-editable; `categories.semantic_key` (`splits` / `mortgage` / `unaccounted`) is the stable identity. Use `findBySemanticKey` / `categoryHasSemanticKey` from `src/lib/categories/semantic-key.ts`, never `findByName`.
- **`SUM()` over a BIGINT column returns a string** from node-pg. Run every aggregate through `coerceBigInt` — a missing one turns an addition into string concatenation with a `number` type still on it.
- **Reads must not write.** `BudgetService.getOverview` is called on every dashboard render; materialising allocation rows is `openMonth`'s job.

### Migrations

Add `drizzle/00XX_description_pg.sql` (statements separated by `--> statement-breakpoint`), then append the filename to `MIGRATION_FILES` in `src/lib/db/migration-manifest.ts` **in apply order** (note: order there is not strictly numeric), and add a detection rule in `migration-seed.ts` if "column/table exists" checks don't cover it. `db:push` records applied files in the `schema_migrations` ledger and, on first run against an existing DB, seeds the ledger from schema detection so nothing re-runs. Prefer idempotent DDL (`ADD COLUMN IF NOT EXISTS`). Full guide: `docs/database.md`. The `*.sql` files without `_pg` suffix are legacy SQLite and unused.

### Startup side effects

`src/instrumentation.ts` runs on server boot (nodejs runtime only): `initDb()`, `startPersistLoop(60s)`, and `NotificationScheduler` (daily 9am calendar summary + per-event reminders, `node-cron`). `server.js` does the equivalent for the custom-server path.

Every replica runs that scheduler, so both jobs take a Postgres advisory lock per tick (`src/lib/db/advisory-lock.ts`) and the loser skips. `db:push` takes a blocking one for the same reason. `GET /api/health` is the readiness probe.

### PWA

Serwist service worker from `src/sw.ts` → `public/sw.js`, wired in `next.config.ts` and **disabled in development**. Test install/push against a production build. `public/manifest.json` is static.

## Docs

Feature-level behaviour and design notes: `docs/` (`feedback.md`, `goals.md`, `mortgage.md`, `recon.md`, `ai-budget-analysis.md`, `feature-access.md`, `calendar.md`, `lists.md`, `mutations-ux.md`, `database.md`, `design-system.md`, `push-notifications.md`). Deployment (Coolify/Docker/Traefik): `DEPLOY.md`. The `README.md` ERD is the current schema reference.

## Notes

- `client/` is an unrelated legacy Vite build artifact — ignore it.
- `.cursor/` contains only a `ui-ux-pro-max` skill (no project rules); there are no Copilot instructions.
