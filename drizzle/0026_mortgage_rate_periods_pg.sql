-- Scheduled mortgage interest rate changes (effective from loan month N).
CREATE TABLE IF NOT EXISTS mortgage_rate_periods (
  id SERIAL PRIMARY KEY,
  mortgage_id INTEGER NOT NULL REFERENCES mortgage_configs(id) ON DELETE CASCADE,
  effective_from_month INTEGER NOT NULL,
  annual_interest_rate REAL NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE (mortgage_id, effective_from_month)
);

CREATE INDEX IF NOT EXISTS mortgage_rate_periods_mortgage_id_idx
  ON mortgage_rate_periods (mortgage_id);
