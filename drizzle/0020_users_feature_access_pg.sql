ALTER TABLE users ADD COLUMN ai_feature_allowed BOOLEAN NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN recon_feature_allowed BOOLEAN NOT NULL DEFAULT false;
--> statement-breakpoint
-- Default grant for household owner; adjust id or run SQL later for other users / admin UI.
UPDATE users SET ai_feature_allowed = true, recon_feature_allowed = true WHERE id = 1;
