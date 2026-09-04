-- Goals become categories with a target. A goal is money assigned like any
-- other, so the envelope model does the arithmetic and there is exactly one way
-- to move money.
ALTER TABLE categories ADD COLUMN IF NOT EXISTS target_minor INTEGER;
--> statement-breakpoint
ALTER TABLE categories ADD COLUMN IF NOT EXISTS target_date TEXT;
--> statement-breakpoint
-- Backfill savings goals into a "Goals" group. Credit goals are a debt payoff
-- plan, not an envelope, and are left where they are.
INSERT INTO categories (name, group_name, household_id, is_active, sort_order, cost_type, target_minor, target_date)
SELECT g.name, 'Goals', u.household_id, TRUE, 900, 'variable',
       g.target_amount, NULL
FROM goals g
JOIN users u ON u.id = g.owner_user_id
WHERE g.type = 'savings'
  AND g.archived_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.household_id = u.household_id AND c.name = g.name
  );
