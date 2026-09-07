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

Local minimum env (put in `.env.local`, auto-loaded by Next): `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL` (no trailing slash). Without `DATABASE_URL` the server still boots but skips DB init / scheduler and DB-backed routes fail. Full env matrix is in `README.md`.

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
- **Repositories** are obtained via `getXRepository()` factories in `src/lib/repositories/index.ts` (lazy singletons typed to the interface). Services take repos as constructor defaults (`constructor(private repo = getExpenseRepository())`) so tests inject fakes. Never `import` a `sql/*.repository` directly outside the factory.
- **`src/lib/db/index.ts`** is the only DB surface: `run`, `get`, `all`, `lastInsertId`, `withTransaction`, plus `initDb` / `startPersistLoop`. Every call is logged with the request-context user (`[DB] …`). There is **no ORM at runtime** — the `drizzle/` folder is just hand-written SQL migration files.
- **Pure finance logic** lives in `src/lib/services/finance/*` (accounts, credit, goals, mortgage, projections, mortgage-rate-periods) and `mortgage-calculator.ts` — no I/O, heavily unit-tested including drift/parity tests in `src/tests/`. Keep money math here, not in repositories or components.

### Cross-cutting conventions

- **Money is integer minor units (cents), currency ZAR.** Convert at the edge with `toMinorUnits` / `fromMinorUnits` / `formatRand` from `src/lib/utils/currency.ts`. DB columns are `INTEGER` or `BIGINT`; `src/lib/db/coerce-bigint.ts` handles `pg` returning bigints as strings.
- **Budget month ≠ calendar month.** Each user has `budget_month_start_day` (1–28). Always derive month windows via `src/lib/utils/budget-month-for-user.ts` (`budgetMonthKeyForUser`, `getBudgetPeriodForUserMonth`) and pass the period down to repositories — don't filter by raw `date` prefix.
- **Optimistic UI contract** (`docs/mutations-ux.md`): UI applies the change immediately, success toast + background `router.refresh()` / query invalidation, failure toast + explicit rollback. Server-list pages mirror RSC props into local state; Calendar uses React Query cache.
- **Timezone:** user-facing "today"/greeting uses Africa/Johannesburg (UTC+2), not the device clock. Date helpers in `src/lib/utils/date.ts`.
- **Feature gating** (AI budget analysis, Recon): needs a server-side allow flag on the user row (`ai_feature_allowed` / `recon_feature_allowed`) **and** a user Settings toggle. See `src/lib/services/feature-access.service.ts`, `docs/feature-access.md`.
- **Polymorphic pointers** (no DB FK): `account_transactions.reference_type/reference_id`, `notes.linked_type/linked_id`. The `account_transactions` ledger is the source of truth for account balances and goal activity.

### Migrations

Add `drizzle/00XX_description_pg.sql` (statements separated by `--> statement-breakpoint`), then append the filename to `MIGRATION_FILES` in `src/lib/db/migration-manifest.ts` **in apply order** (note: order there is not strictly numeric), and add a detection rule in `migration-seed.ts` if "column/table exists" checks don't cover it. `db:push` records applied files in the `schema_migrations` ledger and, on first run against an existing DB, seeds the ledger from schema detection so nothing re-runs. Prefer idempotent DDL (`ADD COLUMN IF NOT EXISTS`). Full guide: `docs/database.md`. The `*.sql` files without `_pg` suffix are legacy SQLite and unused.

### Startup side effects

`src/instrumentation.ts` runs on server boot (nodejs runtime only): `initDb()`, `startPersistLoop(60s)`, and `NotificationScheduler` (daily 9am calendar summary + per-event reminders, `node-cron`). `server.js` does the equivalent for the custom-server path.

### PWA

Serwist service worker from `src/sw.ts` → `public/sw.js`, wired in `next.config.ts` and **disabled in development**. Test install/push against a production build. `public/manifest.json` is static.

## Docs

Feature-level behaviour and design notes: `docs/` (`goals.md`, `mortgage.md`, `recon.md`, `ai-budget-analysis.md`, `feature-access.md`, `calendar.md`, `lists.md`, `mutations-ux.md`, `database.md`, `design-system.md`, `push-notifications.md`). Deployment (Coolify/Docker/Traefik): `DEPLOY.md`. The `README.md` ERD is the current schema reference.

## Notes

- `client/` is an unrelated legacy Vite build artifact — ignore it.
- `.cursor/` contains only a `ui-ux-pro-max` skill (no project rules); there are no Copilot instructions.
