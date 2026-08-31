-- Personal vs shared list visibility (idempotent backfill).
ALTER TABLE shared_lists ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'shared';
--> statement-breakpoint
ALTER TABLE shared_lists ADD COLUMN IF NOT EXISTS owner_user_id INTEGER REFERENCES users(id);
