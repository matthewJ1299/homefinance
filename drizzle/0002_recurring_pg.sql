CREATE TABLE recurring_income (
	id SERIAL PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
	amount INTEGER NOT NULL,
	type TEXT NOT NULL,
	description TEXT,
	day_of_month INTEGER NOT NULL,
	created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE recurring_expenses (
	id SERIAL PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
	category_id INTEGER NOT NULL REFERENCES categories(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
	amount INTEGER NOT NULL,
	note TEXT,
	day_of_month INTEGER NOT NULL,
	created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
ALTER TABLE income ADD COLUMN recurring_income_id INTEGER;
--> statement-breakpoint
ALTER TABLE expenses ADD COLUMN recurring_expense_id INTEGER;
