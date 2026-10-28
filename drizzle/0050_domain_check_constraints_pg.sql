-- Let the database know its own enums.
--
-- Thirteen TEXT columns carried a closed set of values with nothing enforcing
-- it. Each is a place where a typo becomes silent wrong behaviour rather than an
-- error -- the same failure mode as keying settlement logic off a category's
-- display name, which migration 0047 removed.
--
-- Every set below is the UNION of what the code can write and what the database
-- already holds. Those differ in two places, and a constraint built from either
-- one alone would have been wrong:
--   * notes.linked_type          -- code writes 'shared_list_item', which no row
--                                   has yet; rows hold 'household' and 'user',
--                                   which the code no longer writes.
--   * recon_import_items.parse_type -- code writes 'type_a'/'type_b'; rows hold
--                                   the older 'debit'.
-- Historical values are kept rather than cleaned up: a CHECK is not the place to
-- decide that old data was wrong.

-- account_transactions.transaction_type -- AccountTransactionType.
-- 'credit_payment' is in the union and unused so far; excluding it would break
-- the first credit payment anyone records.
ALTER TABLE account_transactions DROP CONSTRAINT IF EXISTS account_transactions_type_ck;
--> statement-breakpoint
ALTER TABLE account_transactions ADD CONSTRAINT account_transactions_type_ck
  CHECK (transaction_type IN (
    'income', 'expense', 'transfer_in', 'transfer_out', 'credit_payment', 'adjustment'
  ));
--> statement-breakpoint

-- Nullable: opening balances and adjustments have no source.
ALTER TABLE account_transactions DROP CONSTRAINT IF EXISTS account_transactions_reference_type_ck;
--> statement-breakpoint
ALTER TABLE account_transactions ADD CONSTRAINT account_transactions_reference_type_ck
  CHECK (reference_type IS NULL OR reference_type IN ('expense', 'income', 'transfer'));
--> statement-breakpoint

ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_ck;
--> statement-breakpoint
ALTER TABLE accounts ADD CONSTRAINT accounts_type_ck
  CHECK (type IN ('bank', 'savings', 'credit'));
--> statement-breakpoint

ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_cost_type_ck;
--> statement-breakpoint
ALTER TABLE categories ADD CONSTRAINT categories_cost_type_ck
  CHECK (cost_type IN ('fixed', 'variable'));
--> statement-breakpoint

-- Migration 0047's identities. NULL is the ordinary category.
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_semantic_key_ck;
--> statement-breakpoint
ALTER TABLE categories ADD CONSTRAINT categories_semantic_key_ck
  CHECK (semantic_key IS NULL OR semantic_key IN ('splits', 'mortgage', 'unaccounted'));
--> statement-breakpoint

-- The legacy income flag. `income_type` (0037) already has its own CHECK.
ALTER TABLE income DROP CONSTRAINT IF EXISTS income_legacy_type_ck;
--> statement-breakpoint
ALTER TABLE income ADD CONSTRAINT income_legacy_type_ck
  CHECK (type IN ('salary', 'ad_hoc'));
--> statement-breakpoint

ALTER TABLE recurring_income DROP CONSTRAINT IF EXISTS recurring_income_type_ck;
--> statement-breakpoint
ALTER TABLE recurring_income ADD CONSTRAINT recurring_income_type_ck
  CHECK (type IN ('salary', 'ad_hoc'));
--> statement-breakpoint

ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_recurrence_type_ck;
--> statement-breakpoint
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_recurrence_type_ck
  CHECK (recurrence_type IN ('none', 'weekly', 'monthly', 'yearly'));
--> statement-breakpoint

ALTER TABLE shared_lists DROP CONSTRAINT IF EXISTS shared_lists_visibility_ck;
--> statement-breakpoint
ALTER TABLE shared_lists ADD CONSTRAINT shared_lists_visibility_ck
  CHECK (visibility IN ('shared', 'personal'));
--> statement-breakpoint

-- 'goal' and 'household'/'user' are historical; 'shared_list_item' is what the
-- code writes now.
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_linked_type_ck;
--> statement-breakpoint
ALTER TABLE notes ADD CONSTRAINT notes_linked_type_ck
  CHECK (linked_type IN ('shared_list_item', 'goal', 'household', 'user'));
--> statement-breakpoint

ALTER TABLE recon_import_items DROP CONSTRAINT IF EXISTS recon_import_items_parse_type_ck;
--> statement-breakpoint
ALTER TABLE recon_import_items ADD CONSTRAINT recon_import_items_parse_type_ck
  CHECK (parse_type IN ('type_a', 'type_b', 'debit'));
--> statement-breakpoint

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_setup_wizard_status_ck;
--> statement-breakpoint
ALTER TABLE users ADD CONSTRAINT users_setup_wizard_status_ck
  CHECK (setup_wizard_status IN ('not_started', 'in_progress', 'dismissed', 'completed'));
--> statement-breakpoint

-- 'goals_and_debt_monthly' is retired but still on historical rows.
ALTER TABLE ai_analysis_runs DROP CONSTRAINT IF EXISTS ai_analysis_runs_analysis_type_ck;
--> statement-breakpoint
ALTER TABLE ai_analysis_runs ADD CONSTRAINT ai_analysis_runs_analysis_type_ck
  CHECK (analysis_type IN ('expenses_monthly', 'goals_and_debt_monthly'));
--> statement-breakpoint

-- Range and format rules the code already enforces in TypeScript, where a bad
-- value written by any other path would go unnoticed.
ALTER TABLE households DROP CONSTRAINT IF EXISTS households_budget_month_start_day_ck;
--> statement-breakpoint
ALTER TABLE households ADD CONSTRAINT households_budget_month_start_day_ck
  CHECK (budget_month_start_day BETWEEN 1 AND 28);
--> statement-breakpoint

-- ISO dates stored as TEXT sort and range-compare correctly only if they are
-- actually ISO. A malformed value drops silently out of every budget-month
-- window rather than raising anything.
--
-- [0-9] rather than \d on purpose: \d matched nothing at all on this server,
-- so a constraint written with it would have rejected every existing row and
-- failed the migration. POSIX classes have no such ambiguity.
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_date_format_ck;
--> statement-breakpoint
ALTER TABLE expenses ADD CONSTRAINT expenses_date_format_ck
  CHECK (date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
--> statement-breakpoint
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_month_format_ck;
--> statement-breakpoint
ALTER TABLE expenses ADD CONSTRAINT expenses_month_format_ck
  CHECK (month ~ '^[0-9]{4}-[0-9]{2}$');
--> statement-breakpoint
ALTER TABLE income DROP CONSTRAINT IF EXISTS income_date_format_ck;
--> statement-breakpoint
ALTER TABLE income ADD CONSTRAINT income_date_format_ck
  CHECK (date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
--> statement-breakpoint
ALTER TABLE income DROP CONSTRAINT IF EXISTS income_month_format_ck;
--> statement-breakpoint
ALTER TABLE income ADD CONSTRAINT income_month_format_ck
  CHECK (month ~ '^[0-9]{4}-[0-9]{2}$');
--> statement-breakpoint
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_month_format_ck;
--> statement-breakpoint
ALTER TABLE budgets ADD CONSTRAINT budgets_month_format_ck
  CHECK (month ~ '^[0-9]{4}-[0-9]{2}$');
--> statement-breakpoint
ALTER TABLE budget_month_opens DROP CONSTRAINT IF EXISTS budget_month_opens_month_format_ck;
--> statement-breakpoint
ALTER TABLE budget_month_opens ADD CONSTRAINT budget_month_opens_month_format_ck
  CHECK (month ~ '^[0-9]{4}-[0-9]{2}$');
--> statement-breakpoint

-- Amounts that can never legitimately be negative. `expenses.amount` is
-- deliberately absent: the balance check writes a negative row.
ALTER TABLE transfers DROP CONSTRAINT IF EXISTS transfers_amount_positive_ck;
--> statement-breakpoint
ALTER TABLE transfers ADD CONSTRAINT transfers_amount_positive_ck CHECK (amount > 0);
--> statement-breakpoint
ALTER TABLE transfers DROP CONSTRAINT IF EXISTS transfers_distinct_accounts_ck;
--> statement-breakpoint
ALTER TABLE transfers ADD CONSTRAINT transfers_distinct_accounts_ck
  CHECK (from_account_id <> to_account_id);
