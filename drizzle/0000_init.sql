CREATE TABLE IF NOT EXISTS `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text NOT NULL DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`group_name` text NOT NULL,
	`icon` text,
	`sort_order` integer NOT NULL DEFAULT 0,
	`is_active` integer NOT NULL DEFAULT 1,
	`cost_type` text NOT NULL DEFAULT 'variable',
	`default_amount` integer,
	`created_at` text NOT NULL DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `income` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL REFERENCES users(id),
	`amount` integer NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`date` text NOT NULL,
	`month` text NOT NULL,
	`created_at` text NOT NULL DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_income_month` ON `income` (`month`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_income_user_month` ON `income` (`user_id`,`month`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL REFERENCES users(id),
	`category_id` integer NOT NULL REFERENCES categories(id),
	`amount` integer NOT NULL,
	`note` text,
	`date` text NOT NULL,
	`month` text NOT NULL,
	`created_at` text NOT NULL DEFAULT (datetime('now')),
	`synced` integer NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_expenses_month` ON `expenses` (`month`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_expenses_user_month` ON `expenses` (`user_id`,`month`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_expenses_category_month` ON `expenses` (`category_id`,`month`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `budgets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_id` integer NOT NULL REFERENCES categories(id),
	`month` text NOT NULL,
	`allocated_amount` integer NOT NULL,
	`created_at` text NOT NULL DEFAULT (datetime('now')),
	`updated_at` text NOT NULL DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `budgets_category_month` ON `budgets` (`category_id`,`month`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_budgets_month` ON `budgets` (`month`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `budget_transfers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from_category_id` integer NOT NULL REFERENCES categories(id),
	`to_category_id` integer NOT NULL REFERENCES categories(id),
	`month` text NOT NULL,
	`amount` integer NOT NULL,
	`user_id` integer NOT NULL REFERENCES users(id),
	`reason` text,
	`created_at` text NOT NULL DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_budget_transfers_month` ON `budget_transfers` (`month`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `mortgage_configs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_value` integer NOT NULL,
	`loan_amount` integer NOT NULL,
	`annual_interest_rate` real NOT NULL,
	`loan_term_months` integer NOT NULL,
	`start_date` text NOT NULL,
	`is_active` integer NOT NULL DEFAULT 1,
	`created_at` text NOT NULL DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `mortgage_user_configs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mortgage_id` integer NOT NULL REFERENCES mortgage_configs(id) ON DELETE CASCADE,
	`user_id` integer NOT NULL REFERENCES users(id),
	`initial_deposit` integer NOT NULL DEFAULT 0,
	`base_split_pct` real NOT NULL,
	`monthly_cap` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `mortgage_user_configs_mortgage_user` ON `mortgage_user_configs` (`mortgage_id`,`user_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `mortgage_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mortgage_id` integer NOT NULL REFERENCES mortgage_configs(id),
	`user_id` integer NOT NULL REFERENCES users(id),
	`payment_date` text NOT NULL,
	`month_number` integer NOT NULL,
	`amount` integer NOT NULL,
	`principal_portion` integer NOT NULL,
	`interest_portion` integer NOT NULL,
	`is_extra_payment` integer NOT NULL DEFAULT 0,
	`note` text,
	`created_at` text NOT NULL DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_mortgage_payments_mortgage` ON `mortgage_payments` (`mortgage_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_mortgage_payments_user` ON `mortgage_payments` (`mortgage_id`,`user_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `mortgage_schedule_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mortgage_id` integer NOT NULL REFERENCES mortgage_configs(id),
	`generated_at` text NOT NULL DEFAULT (datetime('now')),
	`trigger_event` text NOT NULL,
	`trigger_payment_id` integer REFERENCES mortgage_payments(id),
	`schedule_json` text NOT NULL,
	`projected_payoff_date` text NOT NULL,
	`projected_months` integer NOT NULL,
	`monthly_topup` integer NOT NULL,
	`user_a_final_equity_pct` real NOT NULL,
	`user_b_final_equity_pct` real NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_snapshots_mortgage` ON `mortgage_schedule_snapshots` (`mortgage_id`);
