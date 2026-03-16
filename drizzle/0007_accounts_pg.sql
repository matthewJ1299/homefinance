CREATE TABLE accounts (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  owner_user_id BIGINT NOT NULL REFERENCES users(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
  credit_limit BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE INDEX accounts_owner_user_id_idx ON accounts (owner_user_id);
--> statement-breakpoint

CREATE TABLE account_transactions (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON UPDATE NO ACTION ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  transaction_type TEXT NOT NULL,
  reference_type TEXT,
  reference_id BIGINT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE INDEX account_transactions_account_id_idx ON account_transactions (account_id);
--> statement-breakpoint
CREATE INDEX account_transactions_reference_idx ON account_transactions (reference_type, reference_id);
--> statement-breakpoint

CREATE TABLE transfers (
  id BIGSERIAL PRIMARY KEY,
  from_account_id BIGINT NOT NULL REFERENCES accounts(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
  to_account_id BIGINT NOT NULL REFERENCES accounts(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
  amount BIGINT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE INDEX transfers_from_account_id_idx ON transfers (from_account_id);
--> statement-breakpoint
CREATE INDEX transfers_to_account_id_idx ON transfers (to_account_id);
--> statement-breakpoint

ALTER TABLE income
  ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES accounts(id) ON UPDATE NO ACTION ON DELETE SET NULL;
--> statement-breakpoint

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES accounts(id) ON UPDATE NO ACTION ON DELETE SET NULL;
--> statement-breakpoint
