-- Store parsed model output JSON for durable report rendering.
ALTER TABLE ai_analysis_runs
  ADD COLUMN output_json JSONB;
--> statement-breakpoint
UPDATE ai_analysis_runs
SET output_json = COALESCE(output_json, '{}'::jsonb);
--> statement-breakpoint
ALTER TABLE ai_analysis_runs
  ALTER COLUMN output_json SET NOT NULL;
