-- A recon rule can now either FILE a matching transaction (the existing
-- behaviour: category + optional split) or IGNORE it. Ignore rules carry no
-- category. Additive and idempotent: existing rows default to 'file'.
ALTER TABLE recon_rules
  ADD COLUMN IF NOT EXISTS action TEXT NOT NULL DEFAULT 'file';
--> statement-breakpoint
-- No IF NOT EXISTS for ADD CONSTRAINT, so drop-then-add keeps this re-runnable.
ALTER TABLE recon_rules
  DROP CONSTRAINT IF EXISTS recon_rules_action_check;
--> statement-breakpoint
ALTER TABLE recon_rules
  ADD CONSTRAINT recon_rules_action_check CHECK (action IN ('file', 'ignore'));
