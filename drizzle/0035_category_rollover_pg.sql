-- Leftover carried into the next month. Distinct from resolveEffectiveAllocations,
-- which reuses last month's ASSIGNED amount as a template: different number,
-- different column, deliberately not one mechanism serving both.
ALTER TABLE budgets     ADD COLUMN IF NOT EXISTS carried_in_minor INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE categories  ADD COLUMN IF NOT EXISTS rollover BOOLEAN NOT NULL DEFAULT TRUE;
--> statement-breakpoint
-- What makes openMonth idempotent, and what the New month screen is dismissed against.
CREATE TABLE IF NOT EXISTS budget_month_opens (
  id            SERIAL PRIMARY KEY,
  household_id  INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month         TEXT NOT NULL,
  overspend_carried_minor INTEGER NOT NULL DEFAULT 0,
  opened_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (household_id, user_id, month)
);
