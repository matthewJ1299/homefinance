ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS expected_cost_minor INTEGER;
--> statement-breakpoint
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS expense_category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;
--> statement-breakpoint
-- Stops "Log it" from being tapped twice.
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS logged_expense_id  INTEGER REFERENCES expenses(id) ON DELETE SET NULL;
