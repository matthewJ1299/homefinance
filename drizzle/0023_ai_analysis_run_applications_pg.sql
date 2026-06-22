CREATE TABLE ai_analysis_run_applications (
  id BIGSERIAL PRIMARY KEY,
  run_id BIGINT NOT NULL REFERENCES ai_analysis_runs(id) ON DELETE RESTRICT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('allocation_set', 'transfer')),
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  from_category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  to_category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL,
  previous_allocated_cents INTEGER,
  previous_from_allocated_cents INTEGER,
  previous_to_allocated_cents INTEGER,
  suggestion_kind TEXT NOT NULL CHECK (suggestion_kind IN ('allocation_change', 'recommended_move')),
  suggestion_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX ai_analysis_run_applications_run_created_at_idx ON ai_analysis_run_applications (run_id, created_at ASC);
