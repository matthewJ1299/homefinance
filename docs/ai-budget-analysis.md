# AI budget analysis (monthly)

Related: **AI analysis** in Settings (AI toggle + provider selection), **Dashboard** / **Summary** “Analyze spending”, table `ai_analysis_runs`, [feature access](./feature-access.md) (`users.ai_feature_allowed`).

## Flow

1. An administrator grants **AI feature access** for the user (`users.ai_feature_allowed`; future admin UI). Without it, Settings shows a short notice and `analyzeExpenses` returns an error.
2. User enables **AI analysis** under **Settings** (AI is **off by default** among users who are allowed).
3. User chooses month (dashboard or summary) and clicks **Analyze spending**.
4. Server builds a **model payload** (all monetary fields in **minor units / cents**):

   - `month`, `currency: "ZAR"`
   - `income_cents`, `expenses_cents`, `allocated_cents`, `unallocated_cents` (the latter matches budget “to assign” / unallocated figure from `BudgetService.getOverview`)
   - `categories[]`: `name`, `allocated_cents`, `spent_cents`, `prev_month_spent_cents`, `is_overspent`
   - `transactions[]`: `user_name`, `category_name`, `amount_cents`, `note`, `date` (for transaction-level recategorisation hints)

5. The server selects a provider:

   - **Paid**: prefers **OpenAI** when `OPENAI_API_KEY` is configured.
   - **Fallback rule (required)**: if OpenAI returns an **insufficient quota / out of credit** error, the request falls back to **Gemini free**.
   - **Free**: uses the existing **Gemini free** configuration.

6. The selected provider is called with a **system** instruction (YNAB-style coach, JSON only) and a **user** message that embeds the payload plus the required **output schema**.
7. The response is **parsed** into `BudgetAnalysisReport` (see `src/lib/types/budget-ai-report.ts`). If parsing fails, the user sees an error on the dashboard/summary control.
8. The parsed JSON report is saved in Postgres (`ai_analysis_runs.output_json`) and the UI navigates to **`/budget-ai-report?month=yyyy-MM&runId=...`**.

## Money formatting rules

- **Inputs**: all amounts in the model payload are **integer cents** (minor units) for ZAR.
- **Outputs**: any numeric fields named `*_cents` remain integer cents (e.g. `recommended_moves[].amount_cents`).
- **Human-readable text**: whenever the model mentions an amount inside strings (`summary`, `top_issues`, reasons, plan items), it should format it as Rand like `R123.45` (two decimals).

## Report page

- **Route**: `/budget-ai-report`
- **Default**: loads the **latest** saved report for the selected month.
- **Switching**: a dropdown lists saved runs (month + generated timestamp) and loads a specific run by `runId`.
- **Provider label**: the page shows which AI provider was used at the top of the report (stored as a prefix in the saved run’s `input_text`).

## Auditing

Successful runs still insert into **`ai_analysis_runs`** with `analysis_type = expenses_monthly`, `prompt_template_id = expenses_monthly`, `prompt_version = 3`, structured `input_json`, optional `input_text` (full system + user prompt), and `output_text` (raw model JSON string).
