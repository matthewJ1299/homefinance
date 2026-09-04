export type BudgetAnalysisConfidence = "low" | "medium" | "high";

export interface BudgetAnalysisRecommendedMove {
  from_category: string;
  to_category: string;
  amount_cents: number;
  reason: string;
}

export interface BudgetAnalysisRecategorisation {
  transaction_hint: string;
  current_category: string;
  suggested_category: string;
  confidence: BudgetAnalysisConfidence;
  reason: string;
}

export interface BudgetAnalysisNewCategory {
  name: string;
  reason: string;
}

export interface BudgetAnalysisAllocationChange {
  category_name: string;
  new_allocated_cents: number;
  reason: string;
}

/** Parsed model output for monthly budget coaching (JSON). */
export interface BudgetAnalysisReport {
  summary: string;
  top_issues: string[];
  recommended_moves: BudgetAnalysisRecommendedMove[];
  allocation_changes: BudgetAnalysisAllocationChange[];
  recategorisations: BudgetAnalysisRecategorisation[];
  new_categories: BudgetAnalysisNewCategory[];
  next_month_plan: string[];
  data_issues: string[];
}

/** Payload sent to the model (amounts in minor units / cents). */
export interface BudgetAnalysisModelPayload {
  month: string;
  currency: "ZAR";
  income_cents: number;
  expenses_cents: number;
  assigned_cents: number;
  unassigned_cents: number;
  /** Sum of every category's available. What is actually left to spend. */
  envelope_left_cents: number;
  /** Positive sum of this month's negative availables. */
  overspent_cents: number;
  /** Last month's uncovered overspend, already deducted from `unassigned_cents`. */
  carried_overspend_cents: number;
  categories: Array<{
    name: string;
    assigned_cents: number;
    /** Leftover carried in from last month. Spendable exactly like assigned money. */
    carried_in_cents: number;
    spent_cents: number;
    /** assigned + carried_in - spent. */
    available_cents: number;
    prev_month_spent_cents: number;
    is_overspent: boolean;
  }>;
  /** When false, `transactions` is empty; the model should not infer line-item recategorisations. */
  transactions_included: boolean;
  transactions: Array<{
    user_name: string;
    category_name: string;
    amount_cents: number;
    note: string;
    date: string;
  }>;
}

export interface StoredBudgetAiReport {
  month: string;
  report: BudgetAnalysisReport;
  rawModelText: string;
  inputDebugText: string;
}
