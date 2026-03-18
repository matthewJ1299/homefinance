CREATE TABLE goals (
  id BIGSERIAL PRIMARY KEY,
  owner_user_id BIGINT NOT NULL REFERENCES users(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  target_amount BIGINT,
  monthly_target BIGINT NOT NULL,
  linked_account_id BIGINT REFERENCES accounts(id) ON UPDATE NO ACTION ON DELETE SET NULL,
  apr NUMERIC,
  strategy TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE INDEX goals_owner_user_id_idx ON goals (owner_user_id);
--> statement-breakpoint
CREATE INDEX goals_linked_account_id_idx ON goals (linked_account_id);
--> statement-breakpoint

CREATE TABLE goal_contributions (
  id BIGSERIAL PRIMARY KEY,
  goal_id BIGINT NOT NULL REFERENCES goals(id) ON UPDATE NO ACTION ON DELETE CASCADE,
  owner_user_id BIGINT NOT NULL REFERENCES users(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
  account_transaction_id BIGINT NOT NULL REFERENCES account_transactions(id) ON UPDATE NO ACTION ON DELETE CASCADE,
  kind TEXT NOT NULL,
  amount BIGINT NOT NULL,
  effective_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE INDEX goal_contributions_goal_id_idx ON goal_contributions (goal_id);
--> statement-breakpoint
CREATE INDEX goal_contributions_owner_user_id_idx ON goal_contributions (owner_user_id);
--> statement-breakpoint
CREATE INDEX goal_contributions_account_transaction_id_idx ON goal_contributions (account_transaction_id);
--> statement-breakpoint
