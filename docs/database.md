# Database migrations

HomeFinance uses **PostgreSQL** with hand-written SQL migrations in `drizzle/*_pg.sql`. There is no Drizzle ORM at runtime; `npm run db:push` applies pending migrations.

## Migration ledger

Applied migrations are recorded in `schema_migrations`:

| Column | Type | Description |
|--------|------|-------------|
| `filename` | TEXT PK | Migration file name (e.g. `0025_shared_lists_visibility_owner_pg.sql`) |
| `applied_at` | TIMESTAMP | When the migration was applied |

On first run against an **existing** database (users table present, empty ledger), `db:push` **seeds** the ledger using schema detection so migrations are **not re-run** and no data is lost.

## Adding a migration

1. Create the next numbered file: `drizzle/00XX_description_pg.sql`
2. Use `--> statement-breakpoint` between statements (same as existing files)
3. Append the filename to `MIGRATION_FILES` in [src/lib/db/migration-manifest.ts](../src/lib/db/migration-manifest.ts) in the correct order
4. Add a detection rule in [src/lib/db/migration-seed.ts](../src/lib/db/migration-seed.ts) if the migration is not fully covered by “table/column exists” checks
5. Prefer idempotent DDL where possible (`ADD COLUMN IF NOT EXISTS`)
6. Run `npm run db:push` locally against a copy of production schema before deploying

## Commands

| Command | Purpose |
|---------|---------|
| `npm run db:push` | Apply pending migrations (safe on production; additive only) |
| `npm run db:reset` | **Destructive**: drops `public` schema. Requires `ALLOW_DB_RESET=1` |
| `npm run db:fresh` | Reset + push + seed (dev only) |

## Data safety rules

- **`db:push` never drops tables or columns.** It only runs migrations not yet in the ledger.
- **`db:reset` destroys all data.** It refuses to run unless `ALLOW_DB_RESET=1` is set.
- Coolify/docker entrypoint runs `db:push` on container start before serving traffic.
- Money is stored as integer minor units (cents) in `INTEGER` or `BIGINT` columns.
- **`0027_calendar_event_reminders_pg.sql`**: new `calendar_event_reminders` table and `sent_reminders.reminder_id`. Backfills from `calendar_events.reminder_minutes` and re-points existing `sent_reminders` rows. Does not drop existing event rows.
- **`0028_users_owed_to_me_enabled_pg.sql`**: `users.owed_to_me_enabled` (default false; set true for `users.id = 1`).
- **Do not merge `multi-tenant-admin` onto this branch without renumbering.** That branch already used `0027`–`0029` for households / super-admin / setup wizard. This branch now uses `0027` for calendar reminders and `0028` for owed-to-me.

## Related

- Postgres client: [src/lib/db/postgres-client.ts](../src/lib/db/postgres-client.ts)
- Repository pattern: [src/lib/repositories/](../src/lib/repositories/)
- README database ERD section
