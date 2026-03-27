CREATE TABLE IF NOT EXISTS calendar_categories (
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	color TEXT NOT NULL,
	sort_order INTEGER NOT NULL DEFAULT 0
);
--> statement-breakpoint
INSERT INTO calendar_categories (name, color, sort_order)
SELECT v.name, v.color, v.sort_order
FROM (
	VALUES
		('Work', '#3B82F6', 1),
		('Personal', '#22C55E', 2),
		('Family', '#A855F7', 3),
		('Health', '#EF4444', 4),
		('Other', '#F97316', 5)
) AS v(name, color, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM calendar_categories LIMIT 1);
--> statement-breakpoint
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS end_time TEXT;
--> statement-breakpoint
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES calendar_categories(id) ON UPDATE NO ACTION ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 2;
