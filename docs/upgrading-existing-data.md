# Upgrading a database that already has data

The `redesign/ux-pass` branch carries **18 migrations** past `master`: six that
introduce households and the admin portal, eleven for the UX pass, and one that
spares existing users the onboarding wizard. Applying them to a database with
real history is a different exercise from creating a new one, and it was
rehearsed rather than assumed.

## Check your own data first

```bash
DATABASE_URL="postgres://..." node scripts/preflight-upgrade.mjs
```

Read-only -- it writes nothing and opens no transaction, so it is safe to point
at production. It reports whether `db:push` will complete, and what it will
merge on the way:

- **every row can find its owner**, because the household backfill reads it and
  a row that cannot ends the migration with a NULL household_id;
- **budgets unique** on (user, category, month);
- **names unique** in categories, split groups and calendar categories, all of
  which become unique per household;
- which **savings goals will merge** into one category, and which credit goals
  are left alone;
- whether **What I owe** carries over;
- how many users skip the onboarding wizard.

Exit code 0 means clear; 1 means at least one blocker, and it names the rows.

## What the rehearsal does

It builds a database the way yours got here — `master`'s schema and seed, so
pre-household rows, per-user budgets and real split allocations — then runs the
branch's `db:push` over it and compares the two states row by row.

```bash
# 1. a scratch database, so nothing you care about is involved
docker exec homefinance-db psql -U homefinance -d postgres \
  -c "DROP DATABASE IF EXISTS homefinance_migtest;" \
  -c "CREATE DATABASE homefinance_migtest OWNER homefinance;"

# 2. master's world: check it out beside the repo so node_modules still resolves
git worktree add .migration-test/master master
cd .migration-test/master
export DATABASE_URL="postgresql://homefinance:homefinance@localhost:5433/homefinance_migtest"
npx tsx src/lib/db/push.ts      # master's 29 migrations
npx tsx src/lib/db/seed.ts      # pre-household data

# 3. the upgrade
cd ../..
npx tsx src/lib/db/push.ts      # the branch's 18

# 4. clean up
git worktree remove .migration-test/master --force
```

Rehearsing against **your** data instead is the same three steps with a restore
in place of the seed:

```bash
pg_dump "$PROD_DATABASE_URL" > prod.sql
psql -d homefinance_migtest -f prod.sql
npx tsx src/lib/db/push.ts
```

## What it found

Two migrations aborted on data that a fresh database never produces:

| Migration | Failure | Cause |
|---|---|---|
| `0027_households` | `Key (household_id, category_id, month)=(1, 5, 2026-09) is duplicated` | It created a UNIQUE index without `user_id`. Budgets are per person, so moving two people into one household makes the key duplicate immediately. |
| `0043_goals_as_categories` | `duplicate key value violates categories_household_id_name_unique` | Two people saving for the same thing are two `goals` rows but one category. `NOT EXISTS` reads the pre-insert snapshot, so both passed the check. |

Both are fixed. A third problem was behavioural rather than fatal: every user in
an upgraded database read as `not_started`, so the first login sent them to
`/welcome` to add the accounts and income they had been using for months.
`0044_established_users_skip_onboarding` marks anyone with data as done.

## What a failure leaves behind

**Each migration file runs inside its own transaction.** Both aborts above
rolled back whole — verified afterwards: no `households` table, no
`household_id` columns, the ledger still at 29. A failed upgrade leaves the
database exactly as it was, so the recovery is to fix the migration and run
`db:push` again, not to restore.

## What the upgrade is verified to preserve

After the fixes, against pre-household data:

- **No table loses a row.** Users, accounts, expenses, income, budgets,
  transfers, split allocations, mortgage payments, goals, goal contributions,
  calendar and list rows all come through at the same count.
- **No money total changes.** `expenses.amount`, `income.amount`,
  `account_transactions.amount`, `budgets.allocated_amount`,
  `split_allocations.amount`, `mortgage_payments.amount`,
  `goal_contributions.amount` and `transfers.amount` are byte-identical either
  side.
- **Nothing is orphaned.** Every `household_id` across 33 tables is populated
  and points at a real household.
- **The participant backfill reconciles.** Every expense's participant shares
  sum to its amount, and on a split the payer's share is the amount minus the
  allocations.
- **The budget month start day** carries from the household creator, so the
  household does not silently start on day 1.
- **`db:push` is idempotent** — a second run reports "up to date".
- The **integration suite passes against the upgraded database**, not just a
  freshly seeded one.

## Two things to check before you upgrade for real

**"What I owe" is entitled per household now.** `0030` backfills it from the old
per-user `users.owed_to_me_enabled` flag. If nobody has it switched on today,
the upgraded household will not have the feature and a super-admin has to enable
it at `/admin/houses/[id]`.

```sql
SELECT id, name, owed_to_me_enabled FROM users;
```

**Two people saving for the same thing become one category.** The goals backfill
collapses same-named savings goals per household, taking the earliest goal's
target. Worth looking at what you have first:

```sql
SELECT owner_user_id, name, type, target_amount
FROM goals WHERE type = 'savings' AND archived_at IS NULL ORDER BY name;
```

Credit goals are left alone — a debt payoff plan is not an envelope, and the
`goals` and `goal_contributions` tables stay in place, read-only, for a release.
