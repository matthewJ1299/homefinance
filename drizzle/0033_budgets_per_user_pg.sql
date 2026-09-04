-- budgets.user_id was written but absent from the unique constraint, so one
-- household member's allocation overwrote another's. Rebuild the constraint.

-- 1. Collapse any rows that have already collided: keep the newest per
--    (household, category, month, user) and drop true duplicates.
DELETE FROM budgets b USING budgets newer
WHERE b.household_id = newer.household_id
  AND b.category_id  = newer.category_id
  AND b.month        = newer.month
  AND b.user_id      = newer.user_id
  AND b.id < newer.id;
--> statement-breakpoint
-- 2. Drop the old (household, category, month) uniqueness. It exists here as a
--    unique INDEX created by 0027_households_pg.sql, not as a table constraint,
--    so the constraint form is dropped defensively and the index by its real name.
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_household_id_category_id_month_key;
--> statement-breakpoint
DROP INDEX IF EXISTS budgets_household_id_category_id_month_key;
--> statement-breakpoint
DROP INDEX IF EXISTS budgets_household_id_category_id_month_unique;
--> statement-breakpoint
-- Pre-household index, in case an old database still carries it.
DROP INDEX IF EXISTS budgets_user_id_category_id_month_unique;
--> statement-breakpoint
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_household_category_month_user_key;
--> statement-breakpoint
ALTER TABLE budgets
  ADD CONSTRAINT budgets_household_category_month_user_key
  UNIQUE (household_id, category_id, month, user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS budgets_user_month_idx ON budgets (household_id, user_id, month);
