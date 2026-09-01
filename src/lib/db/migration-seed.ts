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
    default:
      return false;
  }
}
