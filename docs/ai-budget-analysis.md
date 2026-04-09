# AI budget analysis (monthly)

Related: **AI analysis** in Settings (`GEMINI_*` keys), **Dashboard** / **Summary** “Analyze spending”, table `ai_analysis_runs`.

## Flow

1. User chooses month (dashboard or summary) and clicks **Analyze spending**.
2. Server builds a **model payload** (all monetary fields in **minor units / cents**):

   - `month`, `currency: "ZAR"`
   - `income_cents`, `expenses_cents`, `allocated_cents`, `unallocated_cents` (the latter matches budget “to assign” / unallocated figure from `BudgetService.getOverview`)
   - `categories[]`: `name`, `allocated_cents`, `spent_cents`, `prev_month_spent_cents`, `is_overspent`
   - `transactions[]`: `user_name`, `category_name`, `amount_cents`, `note`, `date` (for transaction-level recategorisation hints)

3. Gemini is called with a **system** instruction (YNAB-style coach, JSON only) and a **user** message that embeds the payload plus the required **output schema**.
4. `generationConfig.responseMimeType` is set to **`application/json`**.
5. The response is **parsed** into `BudgetAnalysisReport` (see `src/lib/types/budget-ai-report.ts`). If parsing fails, the user sees an error on the dashboard/summary control.
6. The client stores the report in **`sessionStorage`** under `homefinance.budgetAiReport.v1` and navigates to **`/budget-ai-report?month=yyyy-MM`**.

## Report page

- **Route**: `/budget-ai-report`
- **Data**: Read from session storage; the `month` query param must match the stored `month`, or the page shows “no report”.
- **Limitation**: Not durable across browsers, devices, or cleared storage. **Alternative** (not implemented): persist parsed reports (or raw JSON) in Postgres keyed by user + month + run id, then open `/budget-ai-report/[id]`.

## Auditing

Successful runs still insert into **`ai_analysis_runs`** with `analysis_type = expenses_monthly`, `prompt_template_id = expenses_monthly`, `prompt_version = 3`, structured `input_json`, optional `input_text` (full system + user prompt), and `output_text` (raw model JSON string).
