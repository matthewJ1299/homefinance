-- Evolve ai_analysis_runs from "store rendered prompt text" to:
-- store prompt template id + version + structured JSON input (still keeping input_text for backwards compatibility).
ALTER TABLE ai_analysis_runs
  ADD COLUMN prompt_template_id TEXT,
  ADD COLUMN prompt_version INTEGER,
  ADD COLUMN input_json JSONB;
--> statement-breakpoint
UPDATE ai_analysis_runs
SET
  prompt_template_id = COALESCE(prompt_template_id, analysis_type),
  prompt_version = COALESCE(prompt_version, 1),
  input_json = COALESCE(input_json, '{}'::jsonb);
--> statement-breakpoint
ALTER TABLE ai_analysis_runs
  ALTER COLUMN prompt_template_id SET NOT NULL,
  ALTER COLUMN prompt_version SET NOT NULL,
  ALTER COLUMN input_json SET NOT NULL;
