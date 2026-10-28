-- Owner-scoped: rules are personal, like the mailbox they come from.
CREATE TABLE IF NOT EXISTS recon_rules (
  id                   SERIAL PRIMARY KEY,
  household_id         INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  owner_user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_kind           TEXT NOT NULL CHECK (match_kind IN ('merchant_exact','merchant_contains')),
  match_value          TEXT NOT NULL,
  category_id          INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  participant_user_ids INTEGER[] NOT NULL DEFAULT '{}',
  times_used           INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (household_id, owner_user_id, match_kind, match_value)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS recon_rules_owner_idx ON recon_rules (household_id, owner_user_id);
