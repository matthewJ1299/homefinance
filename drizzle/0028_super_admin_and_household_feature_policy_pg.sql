-- Admin portal foundation: super-admin + household feature policy.
-- This is additive and safe to run on existing databases.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false;
--> statement-breakpoint

ALTER TABLE households
  ADD COLUMN IF NOT EXISTS ai_feature_allowed BOOLEAN NOT NULL DEFAULT false;
--> statement-breakpoint

ALTER TABLE households
  ADD COLUMN IF NOT EXISTS recon_feature_allowed BOOLEAN NOT NULL DEFAULT false;
--> statement-breakpoint

-- Back-compat convenience: if the DB used the old convention of user id=1 having access,
-- mark their household as allowed too. This avoids surprising loss of access after upgrades.
UPDATE households h
SET ai_feature_allowed = true,
    recon_feature_allowed = true
FROM users u
WHERE u.id = 1
  AND u.household_id = h.id;
--> statement-breakpoint

-- Optional default: first seeded user is often the operator.
UPDATE users SET is_super_admin = true WHERE id = 1;
