-- Per-user home mode: envelope budgeting ('budget') vs plain spend tracker
-- ('tracker'). A preference, not an entitlement -- see src/lib/features/home-mode.ts.
--
-- Defaults to 'budget' so every existing user keeps the app they have. The
-- column is read fresh each request by getAuthState (like feature_keys), never
-- from the JWT, so a toggle takes effect on the next request.
ALTER TABLE users ADD COLUMN IF NOT EXISTS home_mode TEXT NOT NULL DEFAULT 'budget';
--> statement-breakpoint

-- Enum discipline per migration 0050: the DB knows its own closed set. Postgres
-- has no ADD CONSTRAINT IF NOT EXISTS, so drop-then-add keeps this idempotent.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_home_mode_ck;
--> statement-breakpoint
ALTER TABLE users ADD CONSTRAINT users_home_mode_ck
  CHECK (home_mode IN ('budget', 'tracker'));
