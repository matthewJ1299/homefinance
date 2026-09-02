import { subMonths, format } from "date-fns";
import { lastInsertId, run } from "../index";
import type { SeedContext } from "./types";

export async function seedAi(ctx: SeedContext): Promise<void> {
  const { householdId, mattId, categoryIds } = ctx;
  const reportMonth = format(subMonths(new Date(), 1), "yyyy-MM");

  const inputJson = {
    month: reportMonth,
    currency: "ZAR",
    income_cents: 4_500_000,
    expenses_cents: 3_850_000,
    allocated_cents: 4_100_000,
    unallocated_cents: 400_000,
    categories: [
      {
        name: "Groceries",
        allocated_cents: 450_000,
        spent_cents: 512_000,
        prev_month_spent_cents: 498_000,
        is_overspent: true,
      },
      {
        name: "Dining Out",
        allocated_cents: 85_000,
        spent_cents: 96_500,
        prev_month_spent_cents: 72_000,
        is_overspent: true,
      },
      {
        name: "Savings",
        allocated_cents: 150_000,
        spent_cents: 150_000,
        prev_month_spent_cents: 150_000,
        is_overspent: false,
      },
    ],
    transactions_included: false,
    transactions: [],
  };

  const outputJson = {
    summary:
      "Spending was slightly above plan, mainly groceries and dining. Savings target was met.",
    top_issues: [
      "Groceries overspent by R620",
      "Dining out trending up vs prior month",
    ],
    recommended_moves: [
      {
        from_category: "Entertainment",
        to_category: "Groceries",
        amount_cents: 30_000,
        reason: "Cover groceries overspend without touching savings.",
      },
    ],
    allocation_changes: [
      {
        category_name: "Groceries",
        new_allocated_cents: 480_000,
        reason: "Align with actual spend pattern.",
      },
      {
        category_name: "Dining Out",
        new_allocated_cents: 75_000,
        reason: "Tighten discretionary dining.",
      },
    ],
    recategorisations: [],
    new_categories: [],
    next_month_plan: [
      "Shop with a weekly grocery cap",
      "Limit dining out to twice per week",
      "Keep savings transfer on the 25th",
    ],
    data_issues: [],
  };

  await run(
    `INSERT INTO ai_analysis_runs (user_id, household_id, analysis_type, month, prompt_template_id, prompt_version,
      input_json, input_text, output_text, output_json)
     VALUES (?, ?, 'expenses_monthly', ?, 'expenses_monthly', 6, ?, ?, ?, ?)`,
    [
      mattId,
      householdId,
      reportMonth,
      JSON.stringify(inputJson),
      "Seed monthly budget analysis input.",
      "Seed monthly budget analysis output.",
      JSON.stringify(outputJson),
    ]
  );
  const runId = await lastInsertId();

  await run(
    "INSERT INTO ai_analysis_run_messages (run_id, user_id, role, content) VALUES (?, ?, 'user', ?)",
    [runId, mattId, "Why did groceries go over budget last month?"]
  );
  await run(
    "INSERT INTO ai_analysis_run_messages (run_id, user_id, role, content) VALUES (?, ?, 'assistant', ?)",
    [
      runId,
      mattId,
      "Groceries were R620 over mainly from two large Checkers trips mid-month. Consider a weekly cap or moving R300 from Entertainment.",
    ]
  );

  const groceriesId = categoryIds["Groceries"]!;
  await run(
    `INSERT INTO ai_analysis_run_applications (run_id, user_id, month, action_type, category_id, amount_cents,
      previous_allocated_cents, suggestion_kind, suggestion_index)
     VALUES (?, ?, ?, 'allocation_set', ?, ?, ?, 'allocation_change', 0)`,
    [runId, mattId, reportMonth, groceriesId, 480_000, 450_000]
  );

  console.log("Created sample AI analysis run with messages and one applied suggestion.");
}
