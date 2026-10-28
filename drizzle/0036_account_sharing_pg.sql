-- Accounts are household-scoped already; is_shared decides row visibility.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT FALSE;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS accounts_shared_idx ON accounts (household_id, is_shared);
