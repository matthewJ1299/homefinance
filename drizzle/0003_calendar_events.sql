CREATE TABLE calendar_events (
	id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	created_by_user_id integer NOT NULL,
	name text NOT NULL,
	location text,
	date text NOT NULL,
	time text,
	notes text,
	recurrence_type text NOT NULL,
	recurrence_day_of_month integer,
	created_at text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
);
