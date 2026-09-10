-- Physical design catch-up: household_id leads every predicate in the repository
-- layer and was in almost no index. These are drawn from the actual WHERE/JOIN
-- shapes in src/lib/repositories/sql/*, not guessed.
--
-- Plain CREATE INDEX, not CONCURRENTLY: push.ts wraps each migration file in
-- BEGIN/COMMIT and CONCURRENTLY cannot run inside a transaction. At current row
-- counts the ACCESS EXCLUSIVE lock is milliseconds. That window closes as the
-- tables grow, which is why this lands now.

-- expenses: findByMonth / findByMonthPaginated / countByMonth all filter
-- (household_id, date range) or (household_id, month), optionally + user_id.
CREATE INDEX IF NOT EXISTS expenses_hh_date_idx ON expenses (household_id, date);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS expenses_hh_user_date_idx ON expenses (household_id, user_id, date);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS expenses_hh_month_idx ON expenses (household_id, month);
--> statement-breakpoint
-- getSpendingByCategoryForMonths / getUsageCountsByCategory group by category.
CREATE INDEX IF NOT EXISTS expenses_hh_category_idx ON expenses (household_id, category_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS expenses_account_idx ON expenses (account_id) WHERE account_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS expenses_recurring_idx
  ON expenses (household_id, recurring_expense_id, month)
  WHERE recurring_expense_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS expenses_split_group_idx
  ON expenses (household_id, split_group_id) WHERE split_group_id IS NOT NULL;
--> statement-breakpoint

-- split_allocations.expense_id is an ON DELETE CASCADE target with no index, so
-- every expense delete sequentially scanned this table to enforce the cascade.
CREATE INDEX IF NOT EXISTS split_allocations_expense_idx ON split_allocations (expense_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS split_allocations_user_idx ON split_allocations (user_id);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS income_hh_date_idx ON income (household_id, date);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS income_hh_user_month_idx ON income (household_id, user_id, month);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS split_settlements_hh_payer_idx
  ON split_settlements (household_id, payer_user_id, date);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS split_settlements_recipient_idx ON split_settlements (recipient_user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS split_settlements_expense_idx
  ON split_settlements (expense_id) WHERE expense_id IS NOT NULL;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS calendar_events_hh_creator_idx
  ON calendar_events (household_id, created_by_user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS shared_lists_hh_idx ON shared_lists (household_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS shared_list_items_list_idx ON shared_list_items (list_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS mortgage_payments_mortgage_date_idx
  ON mortgage_payments (mortgage_id, payment_date);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS budget_transfers_hh_month_idx ON budget_transfers (household_id, month);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS recurring_expenses_hh_user_idx ON recurring_expenses (household_id, user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS recurring_income_hh_user_idx ON recurring_income (household_id, user_id);
--> statement-breakpoint
-- findAll() scans users by household on every authenticated page.
CREATE INDEX IF NOT EXISTS users_household_idx ON users (household_id);
