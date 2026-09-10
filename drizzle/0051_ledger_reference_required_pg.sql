-- Close the remaining gap in 0049.
--
-- That migration allowed a row with `reference_type = 'expense'` and a NULL
-- `expense_id`, which is exactly the shape that has no cascade -- so a writer
-- that set only the legacy pointer would quietly reproduce the original bug.
-- The repository now writes both, and the 0049 backfill covered every existing
-- row (135 expense / 21 income / 30 transfer, none orphaned), so the stricter
-- rule is satisfiable today and keeps the guarantee from eroding.
ALTER TABLE account_transactions DROP CONSTRAINT IF EXISTS account_transactions_reference_agrees_ck;
--> statement-breakpoint
ALTER TABLE account_transactions
  ADD CONSTRAINT account_transactions_reference_agrees_ck CHECK (
    CASE reference_type
      WHEN 'expense'  THEN expense_id  IS NOT NULL AND income_id IS NULL AND transfer_id IS NULL
      WHEN 'income'   THEN income_id   IS NOT NULL AND expense_id IS NULL AND transfer_id IS NULL
      WHEN 'transfer' THEN transfer_id IS NOT NULL AND expense_id IS NULL AND income_id IS NULL
      ELSE expense_id IS NULL AND income_id IS NULL AND transfer_id IS NULL
    END
  );
