-- In-app feedback, and the unread marker for the admin screen that reads it.
--
-- Captures what the person said, who they are, what they were trying to do, and
-- where they were. The action and the error text are filled in automatically
-- when feedback is raised from a failure, and left for the person to write when
-- they open it from the menu.

CREATE TABLE IF NOT EXISTS feedback (
  id             SERIAL PRIMARY KEY,
  household_id   INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body           TEXT NOT NULL,
  -- What they were attempting. Null when they had nothing to say about it.
  attempted_action TEXT,
  -- The route they were on, e.g. /budget. Always known.
  pathname       TEXT NOT NULL,
  -- The failure that prompted this, when it came from an error rather than the menu.
  error_message  TEXT,
  -- 'menu' or 'error': how the person got to the form. Worth knowing when
  -- reading a report -- an error-raised one is a bug report, a menu-raised one
  -- is usually a suggestion.
  source         TEXT NOT NULL DEFAULT 'menu',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint

-- Tenant scoping by the 0048 convention: the composite FK makes a row that
-- names a user from another household unrepresentable.
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_user_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE feedback ADD CONSTRAINT feedback_user_id_tenant_fk
  FOREIGN KEY (user_id, household_id) REFERENCES users (id, household_id) ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_source_ck;
--> statement-breakpoint
ALTER TABLE feedback ADD CONSTRAINT feedback_source_ck CHECK (source IN ('menu', 'error'));
--> statement-breakpoint

-- Empty feedback is not feedback.
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_body_present_ck;
--> statement-breakpoint
ALTER TABLE feedback ADD CONSTRAINT feedback_body_present_ck CHECK (btrim(body) <> '');
--> statement-breakpoint

-- The admin screen reads newest-first across every household; the unread count
-- reads the same order with a lower bound.
CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON feedback (created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS feedback_household_created_idx ON feedback (household_id, created_at DESC);
--> statement-breakpoint

-- Per-admin, because two super-admins read the list independently. Null means
-- "never opened it", so everything counts as unread.
ALTER TABLE users ADD COLUMN IF NOT EXISTS feedback_last_seen_at TIMESTAMPTZ;
