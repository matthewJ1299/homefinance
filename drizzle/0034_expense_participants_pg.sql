-- Who was involved in a spend and for how much. Retires the pairwise
-- findAllExcept(userId)[0] assumption that only reads correctly at two people.
CREATE TABLE IF NOT EXISTS expense_participants (
  id            SERIAL PRIMARY KEY,
  household_id  INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  expense_id    INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_minor   INTEGER NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (expense_id, user_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS expense_participants_expense_idx ON expense_participants (expense_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS expense_participants_user_idx ON expense_participants (household_id, user_id);
--> statement-breakpoint
-- Backfill 1: split expenses. The payer's share is the total minus every
-- existing allocation; each allocation becomes a participant row.
INSERT INTO expense_participants (household_id, expense_id, user_id, share_minor)
SELECT e.household_id, e.id, sa.user_id, sa.amount
FROM expenses e
JOIN split_allocations sa ON sa.expense_id = e.id
ON CONFLICT (expense_id, user_id) DO NOTHING;
--> statement-breakpoint
INSERT INTO expense_participants (household_id, expense_id, user_id, share_minor)
SELECT e.household_id, e.id, COALESCE(e.paid_by_user_id, e.user_id),
       e.amount - COALESCE((SELECT SUM(sa.amount) FROM split_allocations sa WHERE sa.expense_id = e.id), 0)
FROM expenses e
WHERE EXISTS (SELECT 1 FROM split_allocations sa WHERE sa.expense_id = e.id)
ON CONFLICT (expense_id, user_id) DO NOTHING;
--> statement-breakpoint
-- Backfill 2: solo expenses get one row for the full amount.
INSERT INTO expense_participants (household_id, expense_id, user_id, share_minor)
SELECT e.household_id, e.id, e.user_id, e.amount
FROM expenses e
WHERE NOT EXISTS (SELECT 1 FROM split_allocations sa WHERE sa.expense_id = e.id)
ON CONFLICT (expense_id, user_id) DO NOTHING;
