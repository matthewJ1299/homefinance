-- mortgage_user_configs keeps the DERIVED monthly share; these two hold the
-- inputs, so the shares can be recalculated when the rate changes.
CREATE TABLE IF NOT EXISTS mortgage_deposits (
  id            SERIAL PRIMARY KEY,
  household_id  INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  mortgage_id   INTEGER NOT NULL REFERENCES mortgage_configs(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_minor  BIGINT NOT NULL,
  UNIQUE (mortgage_id, user_id)
);
--> statement-breakpoint
-- Basis points, not percent: 50% is 5000, and integer maths avoids the drift
-- that makes two people's shares fail to add to 100.
CREATE TABLE IF NOT EXISTS mortgage_targets (
  id              SERIAL PRIMARY KEY,
  household_id    INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  mortgage_id     INTEGER NOT NULL REFERENCES mortgage_configs(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_share_bp INTEGER NOT NULL CHECK (target_share_bp BETWEEN 0 AND 10000),
  UNIQUE (mortgage_id, user_id)
);
