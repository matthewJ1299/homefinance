-- Per-household feature entitlements. Set ONLY by a super-admin in /admin.
-- Row-per-feature so a new sellable feature needs a registry entry (see
-- src/lib/features/registry.ts), not a migration.
-- Additive and idempotent; safe to re-run on existing databases.

CREATE TABLE IF NOT EXISTS household_features (
  household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  config_json JSONB,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by_user_id INTEGER REFERENCES users(id),
  expires_at TIMESTAMPTZ,
  notes TEXT,
  PRIMARY KEY (household_id, feature_key)
);
--> statement-breakpoint

-- Every read is "entitled keys for one household"; the partial index keeps it cheap.
CREATE INDEX IF NOT EXISTS household_features_household_enabled_idx
  ON household_features (household_id) WHERE enabled;
--> statement-breakpoint

-- Backfill 1 - AI. The old gate was households.ai_feature_allowed AND
-- users.ai_feature_allowed, so a household genuinely had AI only if the policy was on
-- AND at least one member was allowed. users.ai_enabled (the Settings opt-in) is
-- deliberately NOT consulted: it is being removed, and a member who had switched it
-- off still *had* the entitlement.
INSERT INTO household_features (household_id, feature_key, enabled, notes)
SELECT h.id, 'ai_budget_analysis', true, 'backfilled by 0030 from households.ai_feature_allowed'
FROM households h
WHERE h.ai_feature_allowed
  AND EXISTS (SELECT 1 FROM users u WHERE u.household_id = h.id AND u.ai_feature_allowed)
ON CONFLICT (household_id, feature_key) DO NOTHING;
--> statement-breakpoint

-- Backfill 2 - Recon, same rule.
INSERT INTO household_features (household_id, feature_key, enabled, notes)
SELECT h.id, 'recon', true, 'backfilled by 0030 from households.recon_feature_allowed'
FROM households h
WHERE h.recon_feature_allowed
  AND EXISTS (SELECT 1 FROM users u WHERE u.household_id = h.id AND u.recon_feature_allowed)
ON CONFLICT (household_id, feature_key) DO NOTHING;
--> statement-breakpoint

-- Backfill 3 - "What I owe" only ever had a per-user flag (0028_users_owed_to_me_enabled).
-- Grant the household if ANY member had it on. Guarded so a database restored partway
-- through the sequence does not abort the transaction on a missing column.
DO $hf_owed$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'owed_to_me_enabled'
  ) THEN
    EXECUTE $sql$
      INSERT INTO household_features (household_id, feature_key, enabled, notes)
      SELECT DISTINCT u.household_id, 'what_i_owe', true,
             'backfilled by 0030 from users.owed_to_me_enabled'
      FROM users u
      WHERE u.owed_to_me_enabled AND u.household_id IS NOT NULL
      ON CONFLICT (household_id, feature_key) DO NOTHING
    $sql$;
  END IF;
END $hf_owed$;
--> statement-breakpoint

-- Mortgage and Goals ship on for every existing household so behaviour is unchanged;
-- they become sellable the moment an admin unticks them.
INSERT INTO household_features (household_id, feature_key, enabled, notes)
SELECT h.id, k, true, 'backfilled by 0030: core product default on'
FROM households h
CROSS JOIN (VALUES ('mortgage'), ('goals')) AS t(k)
ON CONFLICT (household_id, feature_key) DO NOTHING;
--> statement-breakpoint

-- AI tier stops being a per-user choice and becomes an admin-set household attribute.
ALTER TABLE households ADD COLUMN IF NOT EXISTS ai_tier TEXT NOT NULL DEFAULT 'free';
--> statement-breakpoint

ALTER TABLE households DROP CONSTRAINT IF EXISTS households_ai_tier_check;
--> statement-breakpoint

ALTER TABLE households ADD CONSTRAINT households_ai_tier_check
  CHECK (ai_tier IN ('free', 'paid'));
--> statement-breakpoint

-- Nobody loses their paid tier: if any member had picked Paid AI, the household is Paid.
UPDATE households h
SET ai_tier = 'paid'
WHERE h.ai_tier <> 'paid'
  AND EXISTS (SELECT 1 FROM users u WHERE u.household_id = h.id AND u.ai_use_paid);
--> statement-breakpoint

-- The columns below are superseded but intentionally NOT dropped here: db:push is
-- forward-only, so keeping them for one release makes a bad backfill recoverable and
-- the deploy reversible. A later migration drops them once this is proven.
COMMENT ON COLUMN users.ai_feature_allowed IS
  'DEPRECATED 0030: superseded by household_features(feature_key=''ai_budget_analysis''). Unused by the app.';
--> statement-breakpoint
COMMENT ON COLUMN users.recon_feature_allowed IS
  'DEPRECATED 0030: superseded by household_features(feature_key=''recon''). Unused by the app.';
--> statement-breakpoint
COMMENT ON COLUMN users.ai_enabled IS
  'DEPRECATED 0030: per-user opt-in removed; entitlement is per household. Unused by the app.';
--> statement-breakpoint
COMMENT ON COLUMN users.recon_enabled IS
  'DEPRECATED 0030: per-user opt-in removed; entitlement is per household. Unused by the app.';
--> statement-breakpoint
COMMENT ON COLUMN users.ai_use_paid IS
  'DEPRECATED 0030: superseded by households.ai_tier (admin-set). Unused by the app.';
--> statement-breakpoint
COMMENT ON COLUMN households.ai_feature_allowed IS
  'DEPRECATED 0030: superseded by household_features. Unused by the app.';
--> statement-breakpoint
COMMENT ON COLUMN households.recon_feature_allowed IS
  'DEPRECATED 0030: superseded by household_features. Unused by the app.';
