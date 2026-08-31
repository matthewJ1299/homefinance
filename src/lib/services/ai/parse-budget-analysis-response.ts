import type {
  BudgetAnalysisAllocationChange,
  BudgetAnalysisConfidence,
  BudgetAnalysisNewCategory,
  BudgetAnalysisRecategorisation,
  BudgetAnalysisRecommendedMove,
  BudgetAnalysisReport,
} from "@/lib/types/budget-ai-report";

function parseConfidence(value: unknown): BudgetAnalysisConfidence {
  if (value === "low" || value === "medium" || value === "high") return value;
  return "low";
}

function parseRecommendedMove(value: unknown): BudgetAnalysisRecommendedMove | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  if (typeof o.from_category !== "string" || typeof o.to_category !== "string") return null;
  const amount = o.amount_cents;
  const amountCents =
    typeof amount === "number" && Number.isFinite(amount)
      ? Math.round(amount)
      : typeof amount === "string" && /^-?\d+$/.test(amount.trim())
        ? Number.parseInt(amount, 10)
        : null;
  if (amountCents == null || !Number.isFinite(amountCents)) return null;
  return {
    from_category: o.from_category,
    to_category: o.to_category,
    amount_cents: amountCents,
    reason: typeof o.reason === "string" ? o.reason : "",
  };
}

function parseRecategorisation(value: unknown): BudgetAnalysisRecategorisation | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  if (typeof o.transaction_hint !== "string") return null;
  if (typeof o.current_category !== "string" || typeof o.suggested_category !== "string") return null;
  return {
    transaction_hint: o.transaction_hint,
    current_category: o.current_category,
    suggested_category: o.suggested_category,
    confidence: parseConfidence(o.confidence),
    reason: typeof o.reason === "string" ? o.reason : "",
  };
}

function parseAllocationChange(value: unknown): BudgetAnalysisAllocationChange | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  if (typeof o.category_name !== "string") return null;
  const amount = o.new_allocated_cents;
  const amountCents =
    typeof amount === "number" && Number.isFinite(amount)
      ? Math.round(amount)
      : typeof amount === "string" && /^-?\d+$/.test(amount.trim())
        ? Number.parseInt(amount, 10)
        : null;
  if (amountCents == null || !Number.isFinite(amountCents) || amountCents < 0) return null;
  return {
    category_name: o.category_name,
    new_allocated_cents: amountCents,
    reason: typeof o.reason === "string" ? o.reason : "",
  };
}

function parseNewCategory(value: unknown): BudgetAnalysisNewCategory | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  if (typeof o.name !== "string") return null;
  return {
    name: o.name,
    reason: typeof o.reason === "string" ? o.reason : "",
  };
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string");
}

function extractJsonPayload(raw: string): string {
  const trimmed = raw.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence?.[1]) return fence[1].trim();
  return trimmed;
}

export function parseBudgetAnalysisReportFromModelText(raw: string): BudgetAnalysisReport {
  const payload = extractJsonPayload(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new Error("Model output was not valid JSON.");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Model JSON was not an object.");
  }
  const o = parsed as Record<string, unknown>;
  if (typeof o.summary !== "string") {
    throw new Error("Model JSON missing string summary.");
  }
  const recommended = Array.isArray(o.recommended_moves)
    ? o.recommended_moves.map(parseRecommendedMove).filter((x): x is BudgetAnalysisRecommendedMove => x != null)
    : [];
  const recats = Array.isArray(o.recategorisations)
    ? o.recategorisations.map(parseRecategorisation).filter((x): x is BudgetAnalysisRecategorisation => x != null)
    : [];
  const newCats = Array.isArray(o.new_categories)
    ? o.new_categories.map(parseNewCategory).filter((x): x is BudgetAnalysisNewCategory => x != null)
    : [];
  const allocationChanges = Array.isArray(o.allocation_changes)
    ? o.allocation_changes
        .map(parseAllocationChange)
        .filter((x): x is BudgetAnalysisAllocationChange => x != null)
    : [];

  return {
    summary: o.summary,
    top_issues: parseStringArray(o.top_issues),
    recommended_moves: recommended,
    allocation_changes: allocationChanges,
    recategorisations: recats,
    new_categories: newCats,
    next_month_plan: parseStringArray(o.next_month_plan),
    data_issues: parseStringArray(o.data_issues),
  };
}
