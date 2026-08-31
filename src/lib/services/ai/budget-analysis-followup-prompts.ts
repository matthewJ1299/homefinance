import type { AIAnalysisRunMessageRow } from "@/lib/repositories/interfaces/ai-analysis-run-message.repository";
import type { BudgetAnalysisReport } from "@/lib/types/budget-ai-report";

const FOLLOWUP_SYSTEM_PROMPT = `You are a personal finance coach continuing a conversation about a monthly budget report already generated for the user.

Rules:
- Respond in plain text only (no markdown, no JSON).
- Be concise (under 400 words unless the user asks for detail).
- Use only facts from the supplied report and budget data; do not invent transactions or amounts.
- If you reference money in prose, use South African Rand like R123.45.
- Do not redo full analysis unless asked; answer the user's specific question.
- You may clarify, challenge, or expand on prior suggestions.`;

const MAX_PRIOR_MESSAGES = 10;

export function getBudgetAnalysisFollowUpSystemPrompt(): string {
  return FOLLOWUP_SYSTEM_PROMPT;
}

export function buildBudgetAnalysisFollowUpUserPrompt(params: {
  month: string;
  inputJson: unknown;
  report: BudgetAnalysisReport;
  priorMessages: AIAnalysisRunMessageRow[];
  userMessage: string;
}): string {
  const history = params.priorMessages.slice(-MAX_PRIOR_MESSAGES);
  const historyBlock =
    history.length > 0
      ? history.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n")
      : "(no prior messages)";

  return `Month analyzed: ${params.month}

Budget data (JSON, amounts in cents):
${JSON.stringify(params.inputJson, null, 2)}

Saved report (JSON):
${JSON.stringify(params.report, null, 2)}

Prior conversation:
${historyBlock}

User question:
${params.userMessage.trim()}`;
}
