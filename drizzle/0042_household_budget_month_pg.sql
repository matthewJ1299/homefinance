-- Two people looking at different budget months is the bug being fixed, so the
-- start day moves from users to households.
ALTER TABLE households ADD COLUMN IF NOT EXISTS budget_month_start_day INTEGER;
--> statement-breakpoint
-- Creator's day wins. This schema has no households.created_by_user_id, so the
-- doc's second branch is the only one available -- and it resolves to the same
-- person: the creator is the earliest member by id.
UPDATE households h SET budget_month_start_day = COALESCE(
  (SELECT u.budget_month_start_day FROM users u WHERE u.household_id = h.id ORDER BY u.id LIMIT 1),
  1
) WHERE h.budget_month_start_day IS NULL;
--> statement-breakpoint
ALTER TABLE households ALTER COLUMN budget_month_start_day SET DEFAULT 1;
--> statement-breakpoint
ALTER TABLE households ALTER COLUMN budget_month_start_day SET NOT NULL;
--> statement-breakpoint
-- Flag households whose members disagreed, so the app can tell them once.
ALTER TABLE households ADD COLUMN IF NOT EXISTS budget_month_notice_pending BOOLEAN NOT NULL DEFAULT FALSE;
--> statement-breakpoint
UPDATE households h SET budget_month_notice_pending = TRUE
WHERE (SELECT COUNT(DISTINCT u.budget_month_start_day) FROM users u WHERE u.household_id = h.id) > 1;
