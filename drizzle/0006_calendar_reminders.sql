ALTER TABLE calendar_events ADD COLUMN reminder_minutes integer;
--> statement-breakpoint
CREATE TABLE sent_reminders (
	id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	event_id integer NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
	occurrence_date text NOT NULL,
	sent_at text DEFAULT (datetime('now')) NOT NULL,
	UNIQUE(event_id, occurrence_date)
);
