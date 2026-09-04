import type pg from "pg";

type QueryFn = (sql: string) => Promise<pg.QueryResult>;

async function tableExists(query: QueryFn, name: string): Promise<boolean> {
  const r = await query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${name}'`
  );
  return r.rows.length > 0;
}

async function columnExists(query: QueryFn, table: string, column: string): Promise<boolean> {
  const r = await query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = '${column}'`
  );
  return r.rows.length > 0;
}

async function constraintExists(query: QueryFn, table: string, name: string): Promise<boolean> {
  const r = await query(
    `SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = '${table}' AND constraint_name = '${name}'`
  );
  return r.rows.length > 0;
}

/**
 * Returns true when the DB already reflects this migration (for ledger seeding on upgrade).
 */
export async function isMigrationAlreadyApplied(
  query: QueryFn,
  filename: string
): Promise<boolean> {
  switch (filename) {
    case "0000_init_pg.sql":
      return tableExists(query, "users");
    case "0001_split_groups_pg.sql":
      return tableExists(query, "split_groups");
    case "0002_recurring_pg.sql":
      return tableExists(query, "recurring_income");
    case "0003_calendar_events_pg.sql":
      return tableExists(query, "calendar_events");
    case "0004_shared_lists_pg.sql":
      return tableExists(query, "shared_lists");
    case "0005_push_subscriptions_pg.sql":
      return tableExists(query, "push_subscriptions");
    case "0006_calendar_reminders_pg.sql":
      return tableExists(query, "sent_reminders");
    case "0007_accounts_pg.sql":
      return tableExists(query, "accounts");
    case "0008_goals_pg.sql":
      return tableExists(query, "goals");
    case "0009_calendar_categories_and_event_fields_pg.sql":
      return columnExists(query, "calendar_events", "end_time");
    case "0010_calendar_event_end_date_pg.sql":
      return columnExists(query, "calendar_events", "end_date");
    case "0011_budget_month_start_day_pg.sql":
      return columnExists(query, "users", "budget_month_start_day");
    case "0012_primary_account_pg.sql":
      return columnExists(query, "users", "primary_account_id");
    case "0013_recon_pg.sql":
      return tableExists(query, "recon_graph_connections");
    case "0014_recon_last_synced_pg.sql":
      return columnExists(query, "recon_graph_connections", "last_synced_at");
    case "0015_users_recon_enabled_pg.sql":
      return columnExists(query, "users", "recon_enabled");
    case "0016_users_ai_use_paid_pg.sql":
      return columnExists(query, "users", "ai_use_paid");
    case "0019_users_ai_enabled_pg.sql":
      return columnExists(query, "users", "ai_enabled");
    case "0017_ai_analysis_runs_pg.sql":
      return tableExists(query, "ai_analysis_runs");
    case "0018_ai_analysis_runs_structured_input_pg.sql":
      return columnExists(query, "ai_analysis_runs", "prompt_template_id");
    case "0024_ai_analysis_runs_output_json_pg.sql":
      return columnExists(query, "ai_analysis_runs", "output_json");
    case "0020_users_feature_access_pg.sql":
      return columnExists(query, "users", "ai_feature_allowed");
    case "0021_notes_pg.sql":
      return tableExists(query, "notes");
    case "0022_ai_analysis_run_messages_pg.sql":
      return tableExists(query, "ai_analysis_run_messages");
    case "0023_ai_analysis_run_applications_pg.sql":
      return tableExists(query, "ai_analysis_run_applications");
    case "0025_shared_lists_visibility_owner_pg.sql":
      return columnExists(query, "shared_lists", "visibility");
    case "0026_mortgage_rate_periods_pg.sql":
      return tableExists(query, "mortgage_rate_periods");
    case "0027_calendar_event_reminders_pg.sql":
      return tableExists(query, "calendar_event_reminders");
    case "0028_users_owed_to_me_enabled_pg.sql":
      return columnExists(query, "users", "owed_to_me_enabled");
    case "0027_households_pg.sql":
      // Late-stage marker: the final statement adds household_id to schedule snapshots.
      return (
        (await tableExists(query, "households")) &&
        (await columnExists(query, "mortgage_schedule_snapshots", "household_id"))
      );
    case "0028_super_admin_and_household_feature_policy_pg.sql":
      return columnExists(query, "users", "is_super_admin");
    case "0029_users_setup_wizard_state_pg.sql":
      return columnExists(query, "users", "setup_wizard_status");
    case "0030_household_features_pg.sql":
      // Late-stage marker: households.ai_tier is added after the table and all backfills.
      return (
        (await tableExists(query, "household_features")) &&
        (await columnExists(query, "households", "ai_tier"))
      );
    case "0031_user_password_management_pg.sql":
      return columnExists(query, "users", "must_change_password");
    case "0032_household_approval_pg.sql":
      return columnExists(query, "households", "approval_status");
    case "0033_budgets_per_user_pg.sql":
      return constraintExists(query, "budgets", "budgets_household_category_month_user_key");
    case "0034_expense_participants_pg.sql":
      return tableExists(query, "expense_participants");
    case "0035_category_rollover_pg.sql":
      // Late-stage marker: budget_month_opens is created after both column adds.
      return tableExists(query, "budget_month_opens");
    case "0036_account_sharing_pg.sql":
      return columnExists(query, "accounts", "is_shared");
    case "0037_income_types_pg.sql":
      return columnExists(query, "income", "income_type");
    case "0038_mortgage_plan_pg.sql":
      // Late-stage marker: mortgage_targets is created after mortgage_deposits.
      return tableExists(query, "mortgage_targets");
    case "0039_recon_rules_pg.sql":
      return tableExists(query, "recon_rules");
    case "0040_shared_list_category_pg.sql":
      return columnExists(query, "shared_lists", "category_id");
    case "0041_calendar_event_cost_pg.sql":
      // Late-stage marker: logged_expense_id is the last of the three adds.
      return columnExists(query, "calendar_events", "logged_expense_id");
    case "0042_household_budget_month_pg.sql":
      // Late-stage marker: the notice flag is added after the backfill.
      return columnExists(query, "households", "budget_month_notice_pending");
    default:
      return false;
  }
}
