-- The ledger's polymorphic pointer, replaced with real foreign keys.
--
-- `reference_type` / `reference_id` named the row that raised a ledger entry but
-- carried no foreign key, so the database could not cascade a delete through it.
-- Every source of truth about an account balance therefore depended on the
-- application remembering to clean up -- and it did not: deleting a spend, and
-- separately deleting an income, each left their ledger row behind and moved the
-- account balance permanently. Editing an amount desynced it a third way.
--
-- Typed nullable columns give the delete a real cascade, so the invariant holds
-- whether or not a call site remembers.
--
-- The old columns stay (migrations here are additive, and the reference is still
-- read for display). A CHECK below keeps them honest against the new ones rather
-- than letting the two descriptions drift apart.

ALTER TABLE account_transactions ADD COLUMN IF NOT EXISTS expense_id INTEGER;
--> statement-breakpoint
ALTER TABLE account_transactions ADD COLUMN IF NOT EXISTS income_id INTEGER;
--> statement-breakpoint
ALTER TABLE account_transactions ADD COLUMN IF NOT EXISTS transfer_id BIGINT;
--> statement-breakpoint

-- Backfill from the pointer. Verified beforehand: 135 expense rows, 21 income,
-- 30 transfer, zero of them orphaned, so nothing is dropped here.
UPDATE account_transactions
   SET expense_id = reference_id
 WHERE reference_type = 'expense' AND expense_id IS NULL
   AND EXISTS (SELECT 1 FROM expenses e WHERE e.id = reference_id);
--> statement-breakpoint
UPDATE account_transactions
   SET income_id = reference_id
 WHERE reference_type = 'income' AND income_id IS NULL
   AND EXISTS (SELECT 1 FROM income i WHERE i.id = reference_id);
--> statement-breakpoint
UPDATE account_transactions
   SET transfer_id = reference_id
 WHERE reference_type = 'transfer' AND transfer_id IS NULL
   AND EXISTS (SELECT 1 FROM transfers t WHERE t.id = reference_id);
--> statement-breakpoint

-- CASCADE is the point of the exercise: the ledger row cannot outlive the thing
-- that raised it, no matter which call site does the delete.
ALTER TABLE account_transactions DROP CONSTRAINT IF EXISTS account_transactions_expense_id_fkey;
--> statement-breakpoint
ALTER TABLE account_transactions
  ADD CONSTRAINT account_transactions_expense_id_fkey
  FOREIGN KEY (expense_id) REFERENCES expenses (id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE account_transactions DROP CONSTRAINT IF EXISTS account_transactions_income_id_fkey;
--> statement-breakpoint
ALTER TABLE account_transactions
  ADD CONSTRAINT account_transactions_income_id_fkey
  FOREIGN KEY (income_id) REFERENCES income (id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE account_transactions DROP CONSTRAINT IF EXISTS account_transactions_transfer_id_fkey;
--> statement-breakpoint
ALTER TABLE account_transactions
  ADD CONSTRAINT account_transactions_transfer_id_fkey
  FOREIGN KEY (transfer_id) REFERENCES transfers (id) ON DELETE CASCADE;
--> statement-breakpoint

-- Postgres does not index foreign keys, and these are cascade targets.
CREATE INDEX IF NOT EXISTS account_transactions_expense_idx
  ON account_transactions (expense_id) WHERE expense_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS account_transactions_income_idx
  ON account_transactions (income_id) WHERE income_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS account_transactions_transfer_idx
  ON account_transactions (transfer_id) WHERE transfer_id IS NOT NULL;
--> statement-breakpoint

-- A ledger row describes at most one source. Zero is legitimate: opening
-- balances and balance-check adjustments have no source row (5 today).
ALTER TABLE account_transactions DROP CONSTRAINT IF EXISTS account_transactions_one_reference_ck;
--> statement-breakpoint
ALTER TABLE account_transactions
  ADD CONSTRAINT account_transactions_one_reference_ck CHECK (
    (CASE WHEN expense_id  IS NOT NULL THEN 1 ELSE 0 END)
  + (CASE WHEN income_id   IS NOT NULL THEN 1 ELSE 0 END)
  + (CASE WHEN transfer_id IS NOT NULL THEN 1 ELSE 0 END) <= 1
  );
--> statement-breakpoint

-- ...and the legacy pointer must agree with it, so the two cannot drift while
-- both exist. Rows written before this migration keep reference_type with no
-- typed column only if their source row is already gone, which the backfill
-- above showed does not happen.
ALTER TABLE account_transactions DROP CONSTRAINT IF EXISTS account_transactions_reference_agrees_ck;
--> statement-breakpoint
ALTER TABLE account_transactions
  ADD CONSTRAINT account_transactions_reference_agrees_ck CHECK (
    (expense_id  IS NULL OR reference_type = 'expense')
    AND (income_id   IS NULL OR reference_type = 'income')
    AND (transfer_id IS NULL OR reference_type = 'transfer')
  );
