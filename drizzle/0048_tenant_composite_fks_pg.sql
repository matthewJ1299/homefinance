-- Tenancy as a database guarantee, not a convention.
--
-- Every tenant-scoped FK was two independent constraints: the child pointed at a
-- parent row, and separately carried a household_id. Nothing stopped an expense in
-- household A referencing a category in household B -- only requireHouseholdId() in
-- the repository layer did, and one query was found skipping it.
--
-- A composite FK on (fk_column, household_id) makes the cross-tenant reference
-- unrepresentable. No runtime cost; the existing single-column FKs stay for their
-- ON DELETE behaviour and existence guarantee.
--
-- Excluded on purpose: household_features.granted_by_user_id, which points at the
-- super-admin who granted the entitlement and is legitimately in another household
-- (56 such rows today).

-- Composite FKs need a matching unique key on the parent. The id column is already
-- the primary key, so these are logically redundant -- Postgres requires them anyway.
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_id_household_uk;
--> statement-breakpoint
ALTER TABLE accounts ADD CONSTRAINT accounts_id_household_uk UNIQUE (id, household_id);
--> statement-breakpoint
ALTER TABLE calendar_categories DROP CONSTRAINT IF EXISTS calendar_categories_id_household_uk;
--> statement-breakpoint
ALTER TABLE calendar_categories ADD CONSTRAINT calendar_categories_id_household_uk UNIQUE (id, household_id);
--> statement-breakpoint
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_id_household_uk;
--> statement-breakpoint
ALTER TABLE categories ADD CONSTRAINT categories_id_household_uk UNIQUE (id, household_id);
--> statement-breakpoint
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_id_household_uk;
--> statement-breakpoint
ALTER TABLE expenses ADD CONSTRAINT expenses_id_household_uk UNIQUE (id, household_id);
--> statement-breakpoint
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_id_household_uk;
--> statement-breakpoint
ALTER TABLE goals ADD CONSTRAINT goals_id_household_uk UNIQUE (id, household_id);
--> statement-breakpoint
ALTER TABLE income DROP CONSTRAINT IF EXISTS income_id_household_uk;
--> statement-breakpoint
ALTER TABLE income ADD CONSTRAINT income_id_household_uk UNIQUE (id, household_id);
--> statement-breakpoint
ALTER TABLE mortgage_configs DROP CONSTRAINT IF EXISTS mortgage_configs_id_household_uk;
--> statement-breakpoint
ALTER TABLE mortgage_configs ADD CONSTRAINT mortgage_configs_id_household_uk UNIQUE (id, household_id);
--> statement-breakpoint
ALTER TABLE mortgage_payments DROP CONSTRAINT IF EXISTS mortgage_payments_id_household_uk;
--> statement-breakpoint
ALTER TABLE mortgage_payments ADD CONSTRAINT mortgage_payments_id_household_uk UNIQUE (id, household_id);
--> statement-breakpoint
ALTER TABLE split_groups DROP CONSTRAINT IF EXISTS split_groups_id_household_uk;
--> statement-breakpoint
ALTER TABLE split_groups ADD CONSTRAINT split_groups_id_household_uk UNIQUE (id, household_id);
--> statement-breakpoint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_household_uk;
--> statement-breakpoint
ALTER TABLE users ADD CONSTRAINT users_id_household_uk UNIQUE (id, household_id);
--> statement-breakpoint

-- accounts
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_owner_user_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE accounts ADD CONSTRAINT accounts_owner_user_id_tenant_fk
  FOREIGN KEY (owner_user_id, household_id) REFERENCES users (id, household_id);
--> statement-breakpoint
-- ai_analysis_runs
ALTER TABLE ai_analysis_runs DROP CONSTRAINT IF EXISTS ai_analysis_runs_user_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE ai_analysis_runs ADD CONSTRAINT ai_analysis_runs_user_id_tenant_fk
  FOREIGN KEY (user_id, household_id) REFERENCES users (id, household_id) ON DELETE CASCADE;
--> statement-breakpoint
-- budget_month_opens
ALTER TABLE budget_month_opens DROP CONSTRAINT IF EXISTS budget_month_opens_user_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE budget_month_opens ADD CONSTRAINT budget_month_opens_user_id_tenant_fk
  FOREIGN KEY (user_id, household_id) REFERENCES users (id, household_id) ON DELETE CASCADE;
--> statement-breakpoint
-- budget_transfers
ALTER TABLE budget_transfers DROP CONSTRAINT IF EXISTS budget_transfers_from_category_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE budget_transfers ADD CONSTRAINT budget_transfers_from_category_id_tenant_fk
  FOREIGN KEY (from_category_id, household_id) REFERENCES categories (id, household_id);
--> statement-breakpoint
ALTER TABLE budget_transfers DROP CONSTRAINT IF EXISTS budget_transfers_to_category_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE budget_transfers ADD CONSTRAINT budget_transfers_to_category_id_tenant_fk
  FOREIGN KEY (to_category_id, household_id) REFERENCES categories (id, household_id);
--> statement-breakpoint
ALTER TABLE budget_transfers DROP CONSTRAINT IF EXISTS budget_transfers_user_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE budget_transfers ADD CONSTRAINT budget_transfers_user_id_tenant_fk
  FOREIGN KEY (user_id, household_id) REFERENCES users (id, household_id);
--> statement-breakpoint
-- budgets
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_category_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE budgets ADD CONSTRAINT budgets_category_id_tenant_fk
  FOREIGN KEY (category_id, household_id) REFERENCES categories (id, household_id);
--> statement-breakpoint
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_user_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE budgets ADD CONSTRAINT budgets_user_id_tenant_fk
  FOREIGN KEY (user_id, household_id) REFERENCES users (id, household_id);
--> statement-breakpoint
-- calendar_events
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_category_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_category_id_tenant_fk
  FOREIGN KEY (category_id, household_id) REFERENCES calendar_categories (id, household_id) ON DELETE SET NULL (category_id);
--> statement-breakpoint
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_created_by_user_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_created_by_user_id_tenant_fk
  FOREIGN KEY (created_by_user_id, household_id) REFERENCES users (id, household_id);
--> statement-breakpoint
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_expense_category_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_expense_category_id_tenant_fk
  FOREIGN KEY (expense_category_id, household_id) REFERENCES categories (id, household_id) ON DELETE SET NULL (expense_category_id);
--> statement-breakpoint
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_logged_expense_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_logged_expense_id_tenant_fk
  FOREIGN KEY (logged_expense_id, household_id) REFERENCES expenses (id, household_id) ON DELETE SET NULL (logged_expense_id);
--> statement-breakpoint
-- expense_participants
ALTER TABLE expense_participants DROP CONSTRAINT IF EXISTS expense_participants_expense_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE expense_participants ADD CONSTRAINT expense_participants_expense_id_tenant_fk
  FOREIGN KEY (expense_id, household_id) REFERENCES expenses (id, household_id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE expense_participants DROP CONSTRAINT IF EXISTS expense_participants_user_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE expense_participants ADD CONSTRAINT expense_participants_user_id_tenant_fk
  FOREIGN KEY (user_id, household_id) REFERENCES users (id, household_id) ON DELETE CASCADE;
--> statement-breakpoint
-- expenses
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_account_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE expenses ADD CONSTRAINT expenses_account_id_tenant_fk
  FOREIGN KEY (account_id, household_id) REFERENCES accounts (id, household_id) ON DELETE SET NULL (account_id);
--> statement-breakpoint
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE expenses ADD CONSTRAINT expenses_category_id_tenant_fk
  FOREIGN KEY (category_id, household_id) REFERENCES categories (id, household_id);
--> statement-breakpoint
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_paid_by_user_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE expenses ADD CONSTRAINT expenses_paid_by_user_id_tenant_fk
  FOREIGN KEY (paid_by_user_id, household_id) REFERENCES users (id, household_id);
--> statement-breakpoint
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_split_expense_group_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE expenses ADD CONSTRAINT expenses_split_expense_group_id_tenant_fk
  FOREIGN KEY (split_expense_group_id, household_id) REFERENCES split_groups (id, household_id);
--> statement-breakpoint
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_user_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE expenses ADD CONSTRAINT expenses_user_id_tenant_fk
  FOREIGN KEY (user_id, household_id) REFERENCES users (id, household_id);
--> statement-breakpoint
-- goal_contributions
ALTER TABLE goal_contributions DROP CONSTRAINT IF EXISTS goal_contributions_goal_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE goal_contributions ADD CONSTRAINT goal_contributions_goal_id_tenant_fk
  FOREIGN KEY (goal_id, household_id) REFERENCES goals (id, household_id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE goal_contributions DROP CONSTRAINT IF EXISTS goal_contributions_owner_user_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE goal_contributions ADD CONSTRAINT goal_contributions_owner_user_id_tenant_fk
  FOREIGN KEY (owner_user_id, household_id) REFERENCES users (id, household_id);
--> statement-breakpoint
-- goals
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_linked_account_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE goals ADD CONSTRAINT goals_linked_account_id_tenant_fk
  FOREIGN KEY (linked_account_id, household_id) REFERENCES accounts (id, household_id) ON DELETE SET NULL (linked_account_id);
--> statement-breakpoint
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_owner_user_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE goals ADD CONSTRAINT goals_owner_user_id_tenant_fk
  FOREIGN KEY (owner_user_id, household_id) REFERENCES users (id, household_id);
--> statement-breakpoint
-- income
ALTER TABLE income DROP CONSTRAINT IF EXISTS income_account_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE income ADD CONSTRAINT income_account_id_tenant_fk
  FOREIGN KEY (account_id, household_id) REFERENCES accounts (id, household_id) ON DELETE SET NULL (account_id);
--> statement-breakpoint
ALTER TABLE income DROP CONSTRAINT IF EXISTS income_user_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE income ADD CONSTRAINT income_user_id_tenant_fk
  FOREIGN KEY (user_id, household_id) REFERENCES users (id, household_id);
--> statement-breakpoint
-- mortgage_deposits
ALTER TABLE mortgage_deposits DROP CONSTRAINT IF EXISTS mortgage_deposits_mortgage_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE mortgage_deposits ADD CONSTRAINT mortgage_deposits_mortgage_id_tenant_fk
  FOREIGN KEY (mortgage_id, household_id) REFERENCES mortgage_configs (id, household_id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE mortgage_deposits DROP CONSTRAINT IF EXISTS mortgage_deposits_user_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE mortgage_deposits ADD CONSTRAINT mortgage_deposits_user_id_tenant_fk
  FOREIGN KEY (user_id, household_id) REFERENCES users (id, household_id) ON DELETE CASCADE;
--> statement-breakpoint
-- mortgage_payments
ALTER TABLE mortgage_payments DROP CONSTRAINT IF EXISTS mortgage_payments_mortgage_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE mortgage_payments ADD CONSTRAINT mortgage_payments_mortgage_id_tenant_fk
  FOREIGN KEY (mortgage_id, household_id) REFERENCES mortgage_configs (id, household_id);
--> statement-breakpoint
ALTER TABLE mortgage_payments DROP CONSTRAINT IF EXISTS mortgage_payments_user_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE mortgage_payments ADD CONSTRAINT mortgage_payments_user_id_tenant_fk
  FOREIGN KEY (user_id, household_id) REFERENCES users (id, household_id);
--> statement-breakpoint
-- mortgage_schedule_snapshots
ALTER TABLE mortgage_schedule_snapshots DROP CONSTRAINT IF EXISTS mortgage_schedule_snapshots_mortgage_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE mortgage_schedule_snapshots ADD CONSTRAINT mortgage_schedule_snapshots_mortgage_id_tenant_fk
  FOREIGN KEY (mortgage_id, household_id) REFERENCES mortgage_configs (id, household_id);
--> statement-breakpoint
ALTER TABLE mortgage_schedule_snapshots DROP CONSTRAINT IF EXISTS mortgage_schedule_snapshots_trigger_payment_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE mortgage_schedule_snapshots ADD CONSTRAINT mortgage_schedule_snapshots_trigger_payment_id_tenant_fk
  FOREIGN KEY (trigger_payment_id, household_id) REFERENCES mortgage_payments (id, household_id);
--> statement-breakpoint
-- mortgage_targets
ALTER TABLE mortgage_targets DROP CONSTRAINT IF EXISTS mortgage_targets_mortgage_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE mortgage_targets ADD CONSTRAINT mortgage_targets_mortgage_id_tenant_fk
  FOREIGN KEY (mortgage_id, household_id) REFERENCES mortgage_configs (id, household_id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE mortgage_targets DROP CONSTRAINT IF EXISTS mortgage_targets_user_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE mortgage_targets ADD CONSTRAINT mortgage_targets_user_id_tenant_fk
  FOREIGN KEY (user_id, household_id) REFERENCES users (id, household_id) ON DELETE CASCADE;
--> statement-breakpoint
-- mortgage_user_configs
ALTER TABLE mortgage_user_configs DROP CONSTRAINT IF EXISTS mortgage_user_configs_mortgage_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE mortgage_user_configs ADD CONSTRAINT mortgage_user_configs_mortgage_id_tenant_fk
  FOREIGN KEY (mortgage_id, household_id) REFERENCES mortgage_configs (id, household_id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE mortgage_user_configs DROP CONSTRAINT IF EXISTS mortgage_user_configs_user_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE mortgage_user_configs ADD CONSTRAINT mortgage_user_configs_user_id_tenant_fk
  FOREIGN KEY (user_id, household_id) REFERENCES users (id, household_id);
--> statement-breakpoint
-- notes
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_owner_user_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE notes ADD CONSTRAINT notes_owner_user_id_tenant_fk
  FOREIGN KEY (owner_user_id, household_id) REFERENCES users (id, household_id);
--> statement-breakpoint
-- push_subscriptions
ALTER TABLE push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_user_id_tenant_fk
  FOREIGN KEY (user_id, household_id) REFERENCES users (id, household_id) ON DELETE CASCADE;
--> statement-breakpoint
-- recon_graph_connections
ALTER TABLE recon_graph_connections DROP CONSTRAINT IF EXISTS recon_graph_connections_user_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE recon_graph_connections ADD CONSTRAINT recon_graph_connections_user_id_tenant_fk
  FOREIGN KEY (user_id, household_id) REFERENCES users (id, household_id) ON DELETE CASCADE;
--> statement-breakpoint
-- recon_import_items
ALTER TABLE recon_import_items DROP CONSTRAINT IF EXISTS recon_import_items_suggested_category_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE recon_import_items ADD CONSTRAINT recon_import_items_suggested_category_id_tenant_fk
  FOREIGN KEY (suggested_category_id, household_id) REFERENCES categories (id, household_id) ON DELETE SET NULL (suggested_category_id);
--> statement-breakpoint
ALTER TABLE recon_import_items DROP CONSTRAINT IF EXISTS recon_import_items_user_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE recon_import_items ADD CONSTRAINT recon_import_items_user_id_tenant_fk
  FOREIGN KEY (user_id, household_id) REFERENCES users (id, household_id) ON DELETE CASCADE;
--> statement-breakpoint
-- recon_rules
ALTER TABLE recon_rules DROP CONSTRAINT IF EXISTS recon_rules_category_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE recon_rules ADD CONSTRAINT recon_rules_category_id_tenant_fk
  FOREIGN KEY (category_id, household_id) REFERENCES categories (id, household_id) ON DELETE SET NULL (category_id);
--> statement-breakpoint
ALTER TABLE recon_rules DROP CONSTRAINT IF EXISTS recon_rules_owner_user_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE recon_rules ADD CONSTRAINT recon_rules_owner_user_id_tenant_fk
  FOREIGN KEY (owner_user_id, household_id) REFERENCES users (id, household_id) ON DELETE CASCADE;
--> statement-breakpoint
-- recurring_expenses
ALTER TABLE recurring_expenses DROP CONSTRAINT IF EXISTS recurring_expenses_category_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE recurring_expenses ADD CONSTRAINT recurring_expenses_category_id_tenant_fk
  FOREIGN KEY (category_id, household_id) REFERENCES categories (id, household_id);
--> statement-breakpoint
ALTER TABLE recurring_expenses DROP CONSTRAINT IF EXISTS recurring_expenses_user_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE recurring_expenses ADD CONSTRAINT recurring_expenses_user_id_tenant_fk
  FOREIGN KEY (user_id, household_id) REFERENCES users (id, household_id);
--> statement-breakpoint
-- recurring_income
ALTER TABLE recurring_income DROP CONSTRAINT IF EXISTS recurring_income_user_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE recurring_income ADD CONSTRAINT recurring_income_user_id_tenant_fk
  FOREIGN KEY (user_id, household_id) REFERENCES users (id, household_id);
--> statement-breakpoint
-- shared_lists
ALTER TABLE shared_lists DROP CONSTRAINT IF EXISTS shared_lists_category_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE shared_lists ADD CONSTRAINT shared_lists_category_id_tenant_fk
  FOREIGN KEY (category_id, household_id) REFERENCES categories (id, household_id) ON DELETE SET NULL (category_id);
--> statement-breakpoint
ALTER TABLE shared_lists DROP CONSTRAINT IF EXISTS shared_lists_owner_user_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE shared_lists ADD CONSTRAINT shared_lists_owner_user_id_tenant_fk
  FOREIGN KEY (owner_user_id, household_id) REFERENCES users (id, household_id);
--> statement-breakpoint
-- split_settlements
ALTER TABLE split_settlements DROP CONSTRAINT IF EXISTS split_settlements_expense_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE split_settlements ADD CONSTRAINT split_settlements_expense_id_tenant_fk
  FOREIGN KEY (expense_id, household_id) REFERENCES expenses (id, household_id);
--> statement-breakpoint
ALTER TABLE split_settlements DROP CONSTRAINT IF EXISTS split_settlements_income_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE split_settlements ADD CONSTRAINT split_settlements_income_id_tenant_fk
  FOREIGN KEY (income_id, household_id) REFERENCES income (id, household_id);
--> statement-breakpoint
ALTER TABLE split_settlements DROP CONSTRAINT IF EXISTS split_settlements_payer_user_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE split_settlements ADD CONSTRAINT split_settlements_payer_user_id_tenant_fk
  FOREIGN KEY (payer_user_id, household_id) REFERENCES users (id, household_id);
--> statement-breakpoint
ALTER TABLE split_settlements DROP CONSTRAINT IF EXISTS split_settlements_recipient_user_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE split_settlements ADD CONSTRAINT split_settlements_recipient_user_id_tenant_fk
  FOREIGN KEY (recipient_user_id, household_id) REFERENCES users (id, household_id);
--> statement-breakpoint
ALTER TABLE split_settlements DROP CONSTRAINT IF EXISTS split_settlements_split_expense_group_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE split_settlements ADD CONSTRAINT split_settlements_split_expense_group_id_tenant_fk
  FOREIGN KEY (split_expense_group_id, household_id) REFERENCES split_groups (id, household_id);
--> statement-breakpoint
-- transfers
ALTER TABLE transfers DROP CONSTRAINT IF EXISTS transfers_from_account_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE transfers ADD CONSTRAINT transfers_from_account_id_tenant_fk
  FOREIGN KEY (from_account_id, household_id) REFERENCES accounts (id, household_id);
--> statement-breakpoint
ALTER TABLE transfers DROP CONSTRAINT IF EXISTS transfers_to_account_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE transfers ADD CONSTRAINT transfers_to_account_id_tenant_fk
  FOREIGN KEY (to_account_id, household_id) REFERENCES accounts (id, household_id);
--> statement-breakpoint
-- users
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_primary_account_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE users ADD CONSTRAINT users_primary_account_id_tenant_fk
  FOREIGN KEY (primary_account_id, household_id) REFERENCES accounts (id, household_id) ON DELETE SET NULL (primary_account_id);
--> statement-breakpoint
-- vendor_category_mappings
ALTER TABLE vendor_category_mappings DROP CONSTRAINT IF EXISTS vendor_category_mappings_category_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE vendor_category_mappings ADD CONSTRAINT vendor_category_mappings_category_id_tenant_fk
  FOREIGN KEY (category_id, household_id) REFERENCES categories (id, household_id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE vendor_category_mappings DROP CONSTRAINT IF EXISTS vendor_category_mappings_user_id_tenant_fk;
--> statement-breakpoint
ALTER TABLE vendor_category_mappings ADD CONSTRAINT vendor_category_mappings_user_id_tenant_fk
  FOREIGN KEY (user_id, household_id) REFERENCES users (id, household_id) ON DELETE CASCADE;
