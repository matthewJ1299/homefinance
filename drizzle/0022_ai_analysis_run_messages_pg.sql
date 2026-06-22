CREATE TABLE ai_analysis_run_messages (
  id BIGSERIAL PRIMARY KEY,
  run_id BIGINT NOT NULL REFERENCES ai_analysis_runs(id) ON DELETE RESTRICT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX ai_analysis_run_messages_run_created_at_idx ON ai_analysis_run_messages (run_id, created_at ASC);
