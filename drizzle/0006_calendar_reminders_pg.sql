ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS sent_reminders (
	id SERIAL PRIMARY KEY,
	event_id INTEGER NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
	occurrence_date TEXT NOT NULL,
	sent_at TIMESTAMP DEFAULT NOW() NOT NULL,
	UNIQUE(event_id, occurrence_date)
);
