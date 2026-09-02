ALTER TABLE users ADD COLUMN IF NOT EXISTS owed_to_me_enabled BOOLEAN NOT NULL DEFAULT false;
--> statement-breakpoint
-- First user is the usual household owner; everyone else stays off. Toggle later in Settings.
UPDATE users SET owed_to_me_enabled = true WHERE id = 1;
