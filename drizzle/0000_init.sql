CREATE TABLE `budget_transfers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from_category_id` integer NOT NULL,
	`to_category_id` integer NOT NULL,
	`month` text NOT NULL,
	`amount` integer NOT NULL,
	`user_id` integer NOT NULL,
	`reason` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`from_category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	`month` text NOT NULL,
	`allocated_amount` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `budgets_user_id_category_id_month_unique` ON `budgets` (`user_id`,`category_id`,`month`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`group_name` text NOT NULL,
	`icon` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`cost_type` text DEFAULT 'variable' NOT NULL,
	`default_amount` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`note` text,
	`date` text NOT NULL,
	`month` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`synced` integer DEFAULT true NOT NULL,
	`split_group_id` text,
	`paid_by_user_id` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`paid_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `income` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`date` text NOT NULL,
	`month` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `mortgage_configs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_value` integer NOT NULL,
	`loan_amount` integer NOT NULL,
	`annual_interest_rate` real NOT NULL,
	`loan_term_months` integer NOT NULL,
	`start_date` text NOT NULL,
	`target_equity_user_a_pct` real,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mortgage_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mortgage_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`payment_date` text NOT NULL,
	`month_number` integer NOT NULL,
	`amount` integer NOT NULL,
	`principal_portion` integer NOT NULL,
	`interest_portion` integer NOT NULL,
	`is_extra_payment` integer DEFAULT false NOT NULL,
	`note` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`mortgage_id`) REFERENCES `mortgage_configs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `mortgage_schedule_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mortgage_id` integer NOT NULL,
	`generated_at` text DEFAULT (datetime('now')) NOT NULL,
	`trigger_event` text NOT NULL,
	`trigger_payment_id` integer,
	`schedule_json` text NOT NULL,
	`projected_payoff_date` text NOT NULL,
	`projected_months` integer NOT NULL,
	`monthly_topup` integer NOT NULL,
	`user_a_final_equity_pct` real NOT NULL,
	`user_b_final_equity_pct` real NOT NULL,
	FOREIGN KEY (`mortgage_id`) REFERENCES `mortgage_configs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`trigger_payment_id`) REFERENCES `mortgage_payments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `mortgage_user_configs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mortgage_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`initial_deposit` integer DEFAULT 0 NOT NULL,
	`base_split_pct` real NOT NULL,
	`monthly_cap` integer,
	FOREIGN KEY (`mortgage_id`) REFERENCES `mortgage_configs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mortgage_user_configs_mortgage_id_user_id_unique` ON `mortgage_user_configs` (`mortgage_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `split_allocations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`expense_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`amount` integer NOT NULL,
	FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `split_settlements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`payer_user_id` integer NOT NULL,
	`recipient_user_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`date` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`expense_id` integer,
	`income_id` integer,
	FOREIGN KEY (`payer_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipient_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`income_id`) REFERENCES `income`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);