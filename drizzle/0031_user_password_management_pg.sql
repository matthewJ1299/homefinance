-- Password management and resumable onboarding step marker.
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN IF NOT EXISTS setup_wizard_step TEXT;
