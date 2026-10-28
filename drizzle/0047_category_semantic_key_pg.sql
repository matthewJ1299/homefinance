-- Behaviour was keyed off the category's display NAME: `category.name === "Splits"`
-- routed a spend into settlement logic, `name.toLowerCase() === "mortgage"` recorded
-- a bond payment, and findByName("Unaccounted") backed the balance check. Categories
-- are user-editable, so renaming "Splits" silently disabled settlement handling with
-- no error at all -- the spend just became an ordinary expense.
--
-- semantic_key is the stable identity. The name stays free for the user to change.
ALTER TABLE categories ADD COLUMN IF NOT EXISTS semantic_key TEXT;
--> statement-breakpoint

-- One category per key per household. Partial, because the overwhelming majority
-- of categories are ordinary and carry NULL.
CREATE UNIQUE INDEX IF NOT EXISTS categories_household_semantic_key_uidx
  ON categories (household_id, semantic_key)
  WHERE semantic_key IS NOT NULL;
--> statement-breakpoint

-- Backfill from the names the code was matching on, case- and whitespace-insensitively
-- exactly as the old comparisons were. DISTINCT ON keeps the earliest id when a
-- household somehow has two matches, so the unique index above cannot fail the upgrade.
WITH ranked AS (
  SELECT DISTINCT ON (c.household_id, k.key)
         c.id, k.key
  FROM categories c
  JOIN (VALUES
    ('splits',      'splits'),
    ('mortgage',    'mortgage'),
    ('unaccounted', 'unaccounted')
  ) AS k(match_name, key)
    ON lower(btrim(c.name)) = k.match_name
  ORDER BY c.household_id, k.key, c.id
)
UPDATE categories c
   SET semantic_key = ranked.key
  FROM ranked
 WHERE c.id = ranked.id
   AND c.semantic_key IS NULL;
