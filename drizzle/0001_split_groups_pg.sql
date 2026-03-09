CREATE TABLE split_groups (
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL,
	is_default BOOLEAN DEFAULT false NOT NULL,
	sort_order INTEGER DEFAULT 0 NOT NULL,
	created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX split_groups_name_unique ON split_groups (name);
--> statement-breakpoint
INSERT INTO split_groups (name, is_default, sort_order) VALUES ('Default', true, 0);
--> statement-breakpoint
ALTER TABLE expenses ADD COLUMN split_expense_group_id INTEGER REFERENCES split_groups(id);
--> statement-breakpoint
ALTER TABLE split_settlements ADD COLUMN split_expense_group_id INTEGER REFERENCES split_groups(id);
--> statement-breakpoint
UPDATE expenses SET split_expense_group_id = (SELECT id FROM split_groups WHERE is_default = true LIMIT 1) WHERE split_group_id IS NOT NULL AND split_expense_group_id IS NULL;
--> statement-breakpoint
UPDATE split_settlements SET split_expense_group_id = (SELECT id FROM split_groups LIMIT 1) WHERE split_expense_group_id IS NULL;
