-- Multiple reminders per calendar event. Additive: does not drop calendar_events.reminder_minutes
-- (left in place as a deprecated column; one-time backfill copies existing values).
CREATE TABLE IF NOT EXISTS calendar_event_reminders (
	id SERIAL PRIMARY KEY,
	event_id INTEGER NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
	offset_minutes INTEGER NOT NULL,
	send_time TEXT,
	created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS calendar_event_reminders_uidx
	ON calendar_event_reminders (event_id, offset_minutes, COALESCE(send_time, ''));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS calendar_event_reminders_event_id_idx
	ON calendar_event_reminders (event_id);
--> statement-breakpoint
ALTER TABLE sent_reminders ADD COLUMN IF NOT EXISTS reminder_id INTEGER
	REFERENCES calendar_event_reminders(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE sent_reminders DROP CONSTRAINT IF EXISTS sent_reminders_event_id_occurrence_date_key;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS sent_reminders_event_occ_reminder_uidx
	ON sent_reminders (event_id, occurrence_date, COALESCE(reminder_id, 0));
--> statement-breakpoint
INSERT INTO calendar_event_reminders (event_id, offset_minutes, send_time)
SELECT c.id, c.reminder_minutes, NULL
FROM calendar_events c
WHERE c.reminder_minutes IS NOT NULL
	AND NOT EXISTS (
		SELECT 1
		FROM calendar_event_reminders r
		WHERE r.event_id = c.id
			AND r.offset_minutes = c.reminder_minutes
			AND r.send_time IS NULL
	);
--> statement-breakpoint
-- Point legacy sent_reminders rows at the backfilled reminder so the same occurrence is not pushed twice.
UPDATE sent_reminders sr
SET reminder_id = r.id
FROM calendar_event_reminders r
INNER JOIN calendar_events c ON c.id = r.event_id
WHERE sr.event_id = r.event_id
	AND sr.reminder_id IS NULL
	AND r.send_time IS NULL
	AND r.offset_minutes = c.reminder_minutes;
