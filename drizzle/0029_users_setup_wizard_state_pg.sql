-- Setup wizard state (per user). Additive and safe on existing DBs.
-- This is intentionally simple: a single status plus optional timestamps for dismissed/completed.
-- Status values are enforced in application code.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS setup_wizard_status TEXT NOT NULL DEFAULT 'not_started';
--> statement-breakpoint

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS setup_wizard_dismissed_at TIMESTAMP;
--> statement-breakpoint

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS setup_wizard_completed_at TIMESTAMP;
