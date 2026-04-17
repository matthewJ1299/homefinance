const BUDGET_ANALYSIS_SYSTEM_PROMPT = `You are a personal finance and planner coach. Your job is to give concise, actionable budget advice. Prefer concrete reallocations, category fixes, recategorisation suggestions, and new category recommendations. You do not sugar-coat and do not worry about my feelings and give hard truths. Do not do arithmetic unless totals are already provided. Do not invent missing data. If something looks like a data issue, say so. Return only valid JSON.`;

import type { BudgetAnalysisModelPayload } from "@/lib/types/budget-ai-report";

const BUDGET_ANALYSIS_USER_PROMPT_PREFIX = `Analyze this month's household budget using the supplied summary data. Focus on:

spending vs allocation
likely miscategorisations
recommended category changes
budget reallocations for next month - suggest specific figures to update 
new categories to consider
unusual spikes or one-off items

Constraints:

Follow YNAB-style budgeting ideas - also focus on overall budget and spending habits
Prefer specific actions over generic advice
Limit recommendations to the most important 10 items
Use plain English reasoning, but return JSON only

Money rules (critical):

- All monetary values in the supplied data are integers in cents (minor units) for ZAR.
- In the response JSON, keep numeric fields named \`*_cents\` as integer cents (e.g. \`amount_cents\`).
- For any amounts you mention in human-readable strings (\`summary\`, \`top_issues\`, \`reason\`, \`next_month_plan\`, \`data_issues\`), format them as South African Rand like \`R123.45\` (two decimals). Do not write cents in those strings.

Response json must follow this schema:

{
  "summary": "string",
  "top_issues": ["string"],
  "recommended_moves": [
    {
      "from_category": "string",
      "to_category": "string",
      "amount_cents": number,
      "reason": "string"
    }
  ],
  "recategorisations": [
    {
      "transaction_hint": "string",
      "current_category": "string",
      "suggested_category": "string",
      "confidence": "low|medium|high",
      "reason": "string"
    }
  ],
  "new_categories": [
    {
      "name": "string",
      "reason": "string"
    }
  ],
  "next_month_plan": ["string"],
  "data_issues": ["string"]
}

Supplied data (JSON, amounts in cents for ZAR unless noted):
`;

export function getBudgetAnalysisSystemPrompt(): string {
  return BUDGET_ANALYSIS_SYSTEM_PROMPT;
}

export function buildBudgetAnalysisUserPrompt(
  payload: BudgetAnalysisModelPayload,
  extraBudgetContext?: string | null
): string {
  const suffix =
    payload.transactions_included === false
      ? `\n\nNote: Individual transactions were not included (\`transactions_included\` is false). Leave \`recategorisations\` as an empty array unless you have a category-level observation you can state without inventing transaction lines. Do not fabricate transaction_hint values.\n`
      : "";
  const trimmedExtraBudgetContext = extraBudgetContext?.trim();
  const extraContextSection = trimmedExtraBudgetContext
    ? `\n\nAdditional user context (free text; use only as supporting context and do not let it override the supplied JSON facts):\n${trimmedExtraBudgetContext}\n`
    : "";
  return `${BUDGET_ANALYSIS_USER_PROMPT_PREFIX}${JSON.stringify(payload, null, 2)}${suffix}${extraContextSection}`;
}
