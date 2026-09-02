# Multi-household tenancy

## Model

- Each **user** belongs to exactly **one household** (`users.household_id` → `households.id`).
- There is **no** household switching, invites, or cross-household data sharing in the app.
- **Tenant boundary** is `household_id` on domain data: categories, budgets, expenses, income, accounts, transfers, goals, mortgage rows, calendar, shared lists, Recon, AI runs, push subscriptions, splits, and related tables are scoped so one household cannot read or write another’s rows.

Related features:

- **AI and Recon access** — Gated by **`households.ai_feature_allowed` / `households.recon_feature_allowed` AND the per-user `users.*_feature_allowed` flags AND the user's Settings toggle**. `getAiFeatureAllowed` / `getReconFeatureAllowed` resolve the household + user flags together; see [feature-access.md](./feature-access.md).
- **Splits** — Split allocations and settlements only reference users and expenses **within the same household**. Cross-household split demos are not supported.
- **Shared lists / calendar “shared”** — “Household” here means **your** household (the tenant), not a global pool of all app users.
- **Provisioning** — New households can be created via **public self-registration** at `/register` (household starts as `approval_status = pending` until a super-admin approves) or by a global super-admin from **`/admin`**. Both paths run `bootstrapHouseholdDefaults` (default split group + categories + calendar categories). See [passwords.md](./passwords.md) for password rules.
- **Background jobs** — The notification scheduler and the daily-calendar cron route have no session, so they **iterate `households` and bind `setRequestContext({ householdId })` per household** before touching tenant repos.

## Request context and auth

- Server request context (`AsyncLocalStorage`) carries `userId`, `userName`, and **`householdId`**.
- The authenticated app layout sets context from the session. **NextAuth JWT/session** also carries `householdId` so the UI and APIs stay aligned with the DB.
- Repository methods that touch tenant data call `requireHouseholdId()` and add `WHERE household_id = ?` (or equivalent joins) so queries **fail closed** if context is missing.

## Upgrading an existing database

1. Run **`npm run db:push`** so migration `drizzle/0027_households_pg.sql` applies (creates `households`, adds `household_id` columns, backfills from existing users/data). The migration is idempotent; if an older deploy failed mid-way around `calendar_categories`, rerun `db:push` and it resumes. (`0028` adds super-admin + household feature policy, `0029` adds setup-wizard state.)
2. Legacy installs that effectively represent one shared home are backfilled into a single default household. Shared lookup data such as categories, split groups, and calendar categories stay attached to that one household instead of being duplicated per user.
3. Users should **sign out and sign in again** (or clear the session) so the JWT includes `householdId`. Old sessions without it may lack tenant context until refreshed.

## Alternatives (not implemented)

- **One deployment / database per family** — Strong isolation, no multi-tenant code; more operational overhead.
- **Multi-user membership** (spouse invites, roles) — Better for one shared ledger across people who log in as different users; requires membership tables and product UX beyond the current “one household per user” scope.

## Implementation references

- Migrations: `drizzle/0027_households_pg.sql`, `drizzle/0028_super_admin_and_household_feature_policy_pg.sql`, `drizzle/0029_users_setup_wizard_state_pg.sql`, `drizzle/0031_user_password_management_pg.sql`, `drizzle/0032_household_approval_pg.sql` (manifest: `src/lib/db/migration-manifest.ts`, detection: `src/lib/db/migration-seed.ts`)
- Push wiring: `src/lib/db/push.ts` (ledger-backed)
- Context: `src/lib/db/request-context.ts`, `src/lib/auth/set-session-request-context.ts`
- Provisioning: `src/lib/services/registration.service.ts`, `src/lib/services/admin/admin-user-provisioning.service.ts`, `src/app/(auth)/register/page.tsx`, `src/app/admin/*`
- Household defaults: `src/lib/db/bootstrap-household-defaults.ts`
- Feature gate: `src/lib/services/feature-access.service.ts`, `UserRepository.getAiFeatureAllowed` / `getReconFeatureAllowed`
- Background jobs: `src/lib/services/notification-scheduler.service.ts`, `src/app/api/cron/daily-calendar-notification/route.ts`
- Seed: `src/lib/db/seed.ts` (orchestrator), `src/lib/db/seed/*.ts` modules, `src/lib/db/seed-categories.ts`, `src/lib/db/seed-users.ts`
