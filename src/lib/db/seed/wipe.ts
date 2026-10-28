import { run } from "../index";

/** Deletes all app data in FK-safe order. Leaves schema_migrations intact. */
export async function wipeSeedData(): Promise<void> {
  console.log("Clearing existing data...");
  await run("DELETE FROM ai_analysis_run_applications");
  await run("DELETE FROM ai_analysis_run_messages");
  await run("DELETE FROM ai_analysis_runs");
  await run("DELETE FROM notes");
  await run("DELETE FROM sent_reminders");
  await run("DELETE FROM calendar_event_reminders");
  await run("DELETE FROM calendar_events");
  await run("DELETE FROM calendar_categories");
  await run("DELETE FROM shared_list_items");
  await run("DELETE FROM shared_lists");
  await run("DELETE FROM recon_import_items");
  await run("DELETE FROM recon_graph_connections");
  await run("DELETE FROM vendor_category_mappings");
  await run("DELETE FROM push_subscriptions");
  await run("DELETE FROM recurring_income");
  await run("DELETE FROM recurring_expenses");
  await run("DELETE FROM goal_contributions");
  await run("DELETE FROM goals");
  await run("DELETE FROM split_settlements");
  await run("DELETE FROM split_allocations");
  await run("DELETE FROM account_transactions");
  await run("DELETE FROM transfers");
  await run("DELETE FROM expenses");
  await run("DELETE FROM income");
  await run("DELETE FROM split_groups");
  await run("DELETE FROM accounts");
  await run("DELETE FROM budget_transfers");
  await run("DELETE FROM budgets");
  await run("DELETE FROM mortgage_schedule_snapshots");
  await run("DELETE FROM mortgage_payments");
  await run("DELETE FROM mortgage_rate_periods");
  await run("DELETE FROM mortgage_user_configs");
  await run("DELETE FROM mortgage_configs");
  await run("DELETE FROM categories");
  await run("DELETE FROM household_features");
  await run("DELETE FROM users");
  await run("DELETE FROM households");
  console.log("Cleared.");
}
