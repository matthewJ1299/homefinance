CREATE TABLE calendar_events (
	id SERIAL PRIMARY KEY,
	created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
	name TEXT NOT NULL,
	location TEXT,
	date TEXT NOT NULL,
	time TEXT,
	notes TEXT,
	recurrence_type TEXT NOT NULL,
	recurrence_day_of_month INTEGER,
	created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
