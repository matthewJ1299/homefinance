-- Self-registration approval gate for new households.
ALTER TABLE households ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'active';
--> statement-breakpoint
ALTER TABLE households DROP CONSTRAINT IF EXISTS households_approval_status_check;
--> statement-breakpoint
ALTER TABLE households ADD CONSTRAINT households_approval_status_check
  CHECK (approval_status IN ('pending', 'active', 'rejected'));
