# AI budget analysis (monthly)

Related: **AI analysis** in Settings (AI toggle + provider selection), **Dashboard** / **Summary** “Analyze spending”, table `ai_analysis_runs`, [feature access](./feature-access.md) (`users.ai_feature_allowed`).

## Flow

1. An administrator grants **AI feature access** for the user (`users.ai_feature_allowed`; future admin UI). Without it, Settings shows a short notice and `analyzeExpenses` returns an error.
2. User enables **AI analysis** under **Settings** (AI is **off by default** among users who are allowed).
3. User chooses month (dashboard or summary), can optionally add **Extra AI context** free text, and then picks either **Analyze spending** (summary-only, default flow) or **Include all transactions** (full month ledger in the prompt).
4. Server builds a **model payload** (all monetary fields in **minor units / cents**):

   - `month`, `currency: "ZAR"`
   - `income_cents`, `expenses_cents`, `allocated_cents`, `unallocated_cents` (the latter matches budget “to assign” / unallocated figure from `BudgetService.getOverview`)
   - `categories[]`: `name`, `allocated_cents`, `spent_cents`, `prev_month_spent_cents`, `is_overspent`
   - `transactions_included`: boolean; when false, `transactions` is empty and the user prompt tells the model not to invent line-level recategorisations
   - `transactions[]`: `user_name`, `category_name`, `amount_cents`, `note`, `date` (only populated when `transactions_included` is true; for transaction-level recategorisation hints)

5. The server selects a provider:

   - **Paid**: prefers **OpenAI** when `OPENAI_API_KEY` is configured.
   - **Fallback rule (required)**: if OpenAI returns an **insufficient quota / out of credit** error, the request falls back to **Gemini free**.
   - **Free**: uses the existing **Gemini free** configuration.

6. The selected provider is called with a **system** instruction (YNAB-style coach, JSON only) and a **user** message that embeds the payload plus the required **output schema**.
7. If **Extra AI context** was provided, it is appended as a separate free-text section in the user prompt. It is supporting context only and must not override the structured JSON facts.
8. The response is **parsed** into `BudgetAnalysisReport` (see `src/lib/types/budget-ai-report.ts`). If parsing fails, the user sees an error on the dashboard/summary control.
9. The parsed JSON report is saved in Postgres (`ai_analysis_runs.output_json`) and the UI navigates to **`/budget-ai-report?month=yyyy-MM&runId=...`**.

## Report schema (prompt version 6)

New runs use `prompt_version` **6** and may include:

- `allocation_changes[]`: `{ category_name, new_allocated_cents, reason }` — per-category target allocations (names must match payload `categories[].name`).
- Existing fields unchanged: `recommended_moves`, `recategorisations`, `new_categories`, etc.

Older runs without `allocation_changes` still load (`[]` default).

## Apply suggestions to budget

On `/budget-ai-report`, when AI is enabled:

1. **Suggested budget changes** and **Recommended moves** can be selected with checkboxes.
2. **Apply selected** opens a confirmation dialog (current → proposed amounts from live budget overview).
3. Server re-reads budget state, validates categories and transfer `remaining`, then applies in a **single transaction**.
4. Each applied change is recorded in **`ai_analysis_run_applications`** (audit: prior allocations, action type, suggestion index). Failed validation skips that row; a failed mid-batch write rolls back the whole batch.

Apply targets the **report month** (`run.month`). Transfers require sufficient **remaining** in the source category.

Not applied in v1: `recategorisations` (expenses), `new_categories` (category creation).

## Feedback chat

- **Ask about this report** on the same page: plain-text Q&A persisted in **`ai_analysis_run_messages`** (linked to `run_id`, `ON DELETE RESTRICT`).
- User message is saved **before** the LLM call; assistant reply is saved only on success.
- Does **not** update `ai_analysis_runs.output_json`; original report stays immutable.
- Uses the same rate limit as **Analyze spending** (5 calls/user/hour).

## Money formatting rules

- **Inputs**: all amounts in the model payload are **integer cents** (minor units) for ZAR.
- **Outputs**: any numeric fields named `*_cents` remain integer cents (e.g. `recommended_moves[].amount_cents`).
- **Human-readable text**: whenever the model mentions an amount inside strings (`summary`, `top_issues`, reasons, plan items), it should format it as Rand like `R123.45` (two decimals).

## Report page

- **Route**: `/budget-ai-report`
- **Default**: loads the **latest** saved report for the selected month.
- **Switching**: a dropdown lists saved runs (month + generated timestamp) and loads a specific run by `runId`.
- **Provider label**: the page shows which AI provider was used at the top of the report (stored as a prefix in the saved run’s `input_text`).
- **Apply panel** and **feedback chat** (see above).
- **Applied to budget** summary when audit rows exist for the run.

## Auditing

Successful runs still **insert** into **`ai_analysis_runs`** (rows are not updated by chat or apply). Fields: `analysis_type = expenses_monthly`, `prompt_template_id = expenses_monthly`, `prompt_version = 6` (new runs), structured `input_json`, optional `input_text` (full system + user prompt, including any extra free-text context), `output_text`, and `output_json`.

Related tables (migrations `0022`, `0023`; wired in `npm run db:push`):

- `ai_analysis_run_messages` — chat thread per run.
- `ai_analysis_run_applications` — budget apply audit log per run.
