/**
 * Explicit migration order (filename only). Handles duplicate numeric prefixes
 * and matches the sequence historically applied by push.ts.
 */
export const MIGRATION_FILES: readonly string[] = [
  "0000_init_pg.sql",
  "0001_split_groups_pg.sql",
  "0002_recurring_pg.sql",
  "0003_calendar_events_pg.sql",
  "0004_shared_lists_pg.sql",
  "0005_push_subscriptions_pg.sql",
  "0006_calendar_reminders_pg.sql",
  "0007_accounts_pg.sql",
  "0008_goals_pg.sql",
  "0009_calendar_categories_and_event_fields_pg.sql",
  "0010_calendar_event_end_date_pg.sql",
  "0011_budget_month_start_day_pg.sql",
  "0012_primary_account_pg.sql",
  "0013_recon_pg.sql",
  "0014_recon_last_synced_pg.sql",
  "0015_users_recon_enabled_pg.sql",
  "0016_users_ai_use_paid_pg.sql",
  "0019_users_ai_enabled_pg.sql",
  "0017_ai_analysis_runs_pg.sql",
  "0018_ai_analysis_runs_structured_input_pg.sql",
  "0024_ai_analysis_runs_output_json_pg.sql",
  "0020_users_feature_access_pg.sql",
  "0021_notes_pg.sql",
  "0022_ai_analysis_run_messages_pg.sql",
  "0023_ai_analysis_run_applications_pg.sql",
  "0025_shared_lists_visibility_owner_pg.sql",
  "0026_mortgage_rate_periods_pg.sql",
  // Duplicate 0027/0028 prefixes: this branch and master numbered independently.
  // Order below is by real dependency, not by number. The calendar-reminder and
  // owed-to-me migrations are self-contained table/column adds that never touch
  // households, so they run first and the households stack lands on a settled schema.
  "0027_calendar_event_reminders_pg.sql",
  "0028_users_owed_to_me_enabled_pg.sql",
  "0027_households_pg.sql",
  "0028_super_admin_and_household_feature_policy_pg.sql",
  "0029_users_setup_wizard_state_pg.sql",
];
