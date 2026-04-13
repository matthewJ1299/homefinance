# Multi-household tenancy

## Model

- Each **user** belongs to exactly **one household** (`users.household_id` → `households.id`).
- There is **no** household switching, invites, or cross-household data sharing in the app.
- **Tenant boundary** is `household_id` on domain data: categories, budgets, expenses, income, accounts, transfers, goals, mortgage rows, calendar, shared lists, Recon, AI runs, push subscriptions, splits, and related tables are scoped so one household cannot read or write another’s rows.

Related features:

- **AI and Recon access** — Still gated per user via `ai_feature_allowed` / `recon_feature_allowed` and Settings; see [feature-access.md](./feature-access.md).
- **Splits** — Split allocations and settlements only reference users and expenses **within the same household**. Cross-household split demos are not supported.
- **Shared lists / calendar “shared”** — “Household” here means **your** household (the tenant), not a global pool of all app users.
- **Registration** — `/register` creates a new household, default categories and split group for that household, then the first user. Use this for a new family without running seed scripts.

## Request context and auth

- Server request context (`AsyncLocalStorage`) carries `userId`, `userName`, and **`householdId`**.
- The authenticated app layout sets context from the session. **NextAuth JWT/session** also carries `householdId` so the UI and APIs stay aligned with the DB.
- Repository methods that touch tenant data call `requireHouseholdId()` and add `WHERE household_id = ?` (or equivalent joins) so queries **fail closed** if context is missing.

## Upgrading an existing database

1. Run **`npm run db:push`** so migration `drizzle/0022_households_pg.sql` applies (creates `households`, adds `household_id` columns, backfills from existing users/data).
2. Users should **sign out and sign in again** (or clear the session) so the JWT includes `householdId`. Old sessions without it may lack tenant context until refreshed.

## Alternatives (not implemented)

- **One deployment / database per family** — Strong isolation, no multi-tenant code; more operational overhead.
- **Multi-user membership** (spouse invites, roles) — Better for one shared ledger across people who log in as different users; requires membership tables and product UX beyond the current “one household per user” scope.

## Implementation references

- Migration: `drizzle/0022_households_pg.sql`
- Push wiring: `src/lib/db/push.ts`
- Context: `src/lib/db/request-context.ts`, `src/lib/auth/set-session-request-context.ts`
- Registration: `src/lib/actions/register.actions.ts`, `src/app/(auth)/register/page.tsx`
- Household defaults: `src/lib/db/bootstrap-household-defaults.ts`
- Seed: `src/lib/db/seed.ts`, `src/lib/db/seed-categories.ts`
