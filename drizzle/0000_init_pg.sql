CREATE TABLE users (
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL,
	email TEXT NOT NULL,
	password_hash TEXT NOT NULL,
	created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX users_email_unique ON users (email);--> statement-breakpoint
CREATE TABLE categories (
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL,
	group_name TEXT NOT NULL,
	icon TEXT,
	sort_order INTEGER DEFAULT 0 NOT NULL,
	is_active BOOLEAN DEFAULT true NOT NULL,
	cost_type TEXT DEFAULT 'variable' NOT NULL,
	default_amount INTEGER,
	created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX categories_name_unique ON categories (name);--> statement-breakpoint
CREATE TABLE budget_transfers (
	id SERIAL PRIMARY KEY,
	from_category_id INTEGER NOT NULL REFERENCES categories(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
	to_category_id INTEGER NOT NULL REFERENCES categories(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
	month TEXT NOT NULL,
	amount INTEGER NOT NULL,
	user_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
	reason TEXT,
	created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE budgets (
	id SERIAL PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
	category_id INTEGER NOT NULL REFERENCES categories(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
	month TEXT NOT NULL,
	allocated_amount INTEGER NOT NULL,
	created_at TIMESTAMP DEFAULT NOW() NOT NULL,
	updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX budgets_user_id_category_id_month_unique ON budgets (user_id, category_id, month);--> statement-breakpoint
CREATE TABLE expenses (
	id SERIAL PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
	category_id INTEGER NOT NULL REFERENCES categories(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
	amount INTEGER NOT NULL,
	note TEXT,
	date TEXT NOT NULL,
	month TEXT NOT NULL,
	created_at TIMESTAMP DEFAULT NOW() NOT NULL,
	synced BOOLEAN DEFAULT true NOT NULL,
	split_group_id TEXT,
	paid_by_user_id INTEGER REFERENCES users(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);
--> statement-breakpoint
CREATE TABLE income (
	id SERIAL PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
	amount INTEGER NOT NULL,
	type TEXT NOT NULL,
	description TEXT,
	date TEXT NOT NULL,
	month TEXT NOT NULL,
	created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE mortgage_configs (
	id SERIAL PRIMARY KEY,
	property_value INTEGER NOT NULL,
	loan_amount INTEGER NOT NULL,
	annual_interest_rate REAL NOT NULL,
	loan_term_months INTEGER NOT NULL,
	start_date TEXT NOT NULL,
	target_equity_user_a_pct REAL,
	is_active BOOLEAN DEFAULT true NOT NULL,
	created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE mortgage_payments (
	id SERIAL PRIMARY KEY,
	mortgage_id INTEGER NOT NULL REFERENCES mortgage_configs(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
	user_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
	payment_date TEXT NOT NULL,
	month_number INTEGER NOT NULL,
	amount INTEGER NOT NULL,
	principal_portion INTEGER NOT NULL,
	interest_portion INTEGER NOT NULL,
	is_extra_payment BOOLEAN DEFAULT false NOT NULL,
	note TEXT,
	created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE mortgage_schedule_snapshots (
	id SERIAL PRIMARY KEY,
	mortgage_id INTEGER NOT NULL REFERENCES mortgage_configs(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
	generated_at TIMESTAMP DEFAULT NOW() NOT NULL,
	trigger_event TEXT NOT NULL,
	trigger_payment_id INTEGER REFERENCES mortgage_payments(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
	schedule_json TEXT NOT NULL,
	projected_payoff_date TEXT NOT NULL,
	projected_months INTEGER NOT NULL,
	monthly_topup INTEGER NOT NULL,
	user_a_final_equity_pct REAL NOT NULL,
	user_b_final_equity_pct REAL NOT NULL
);
--> statement-breakpoint
CREATE TABLE mortgage_user_configs (
	id SERIAL PRIMARY KEY,
	mortgage_id INTEGER NOT NULL REFERENCES mortgage_configs(id) ON UPDATE NO ACTION ON DELETE CASCADE,
	user_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
	initial_deposit INTEGER DEFAULT 0 NOT NULL,
	base_split_pct REAL NOT NULL,
	monthly_cap INTEGER
);
--> statement-breakpoint
CREATE UNIQUE INDEX mortgage_user_configs_mortgage_id_user_id_unique ON mortgage_user_configs (mortgage_id, user_id);--> statement-breakpoint
CREATE TABLE split_allocations (
	id SERIAL PRIMARY KEY,
	expense_id INTEGER NOT NULL REFERENCES expenses(id) ON UPDATE NO ACTION ON DELETE CASCADE,
	user_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
	amount INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE split_settlements (
	id SERIAL PRIMARY KEY,
	payer_user_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
	recipient_user_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
	amount INTEGER NOT NULL,
	date TEXT NOT NULL,
	created_at TIMESTAMP DEFAULT NOW() NOT NULL,
	expense_id INTEGER REFERENCES expenses(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
	income_id INTEGER REFERENCES income(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);
