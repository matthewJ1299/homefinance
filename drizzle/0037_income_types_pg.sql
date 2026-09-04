-- The existing `type` column (salary / ad_hoc) is load-bearing for settlements:
-- SplitService.settle writes type = 'ad_hoc'. Leave it alone. income_type is
-- the user-facing taxonomy layered on top.
ALTER TABLE income ADD COLUMN IF NOT EXISTS income_type TEXT;
--> statement-breakpoint
UPDATE income SET income_type = CASE
  WHEN type = 'salary' THEN 'salary'
  ELSE 'other'
END WHERE income_type IS NULL;
--> statement-breakpoint
ALTER TABLE income ALTER COLUMN income_type SET DEFAULT 'salary';
--> statement-breakpoint
ALTER TABLE income ALTER COLUMN income_type SET NOT NULL;
--> statement-breakpoint
ALTER TABLE income DROP CONSTRAINT IF EXISTS income_type_allowed;
--> statement-breakpoint
ALTER TABLE income ADD CONSTRAINT income_type_allowed
  CHECK (income_type IN ('salary','bonus','interest','gift','other'));
