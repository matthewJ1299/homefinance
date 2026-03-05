/**
 * Row types for SQLite tables (snake_case column names as in the database).
 * Used by repositories when mapping query results.
 */

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface CategoryRow {
  id: number;
  name: string;
  group_name: string;
  icon: string | null;
  sort_order: number;
  is_active: number;
  cost_type: string;
  default_amount: number | null;
  created_at: string;
}

export interface IncomeRow {
  id: number;
  user_id: number;
  amount: number;
  type: string;
  description: string | null;
  date: string;
  month: string;
  created_at: string;
}

export interface ExpenseRow {
  id: number;
  user_id: number;
  category_id: number;
  amount: number;
  note: string | null;
  date: string;
  month: string;
  created_at: string;
  synced: number;
  split_group_id: string | null;
  paid_by_user_id: number | null;
}

export interface SplitAllocationRow {
  id: number;
  expense_id: number;
  user_id: number;
  amount: number;
}

export interface SplitSettlementRow {
  id: number;
  payer_user_id: number;
  recipient_user_id: number;
  amount: number;
  date: string;
  created_at: string;
  expense_id: number | null;
  income_id: number | null;
}

export interface BudgetRow {
  id: number;
  user_id: number;
  category_id: number;
  month: string;
  allocated_amount: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetTransferRow {
  id: number;
  from_category_id: number;
  to_category_id: number;
  month: string;
  amount: number;
  user_id: number;
  reason: string | null;
  created_at: string;
}

export interface MortgageConfigRow {
  id: number;
  property_value: number;
  loan_amount: number;
  annual_interest_rate: number;
  loan_term_months: number;
  start_date: string;
  target_equity_user_a_pct: number | null;
  is_active: number;
  created_at: string;
}

export interface MortgageUserConfigRow {
  id: number;
  mortgage_id: number;
  user_id: number;
  initial_deposit: number;
  base_split_pct: number;
  monthly_cap: number | null;
}

export interface MortgagePaymentRow {
  id: number;
  mortgage_id: number;
  user_id: number;
  payment_date: string;
  month_number: number;
  amount: number;
  principal_portion: number;
  interest_portion: number;
  is_extra_payment: number;
  note: string | null;
  created_at: string;
}

export interface MortgageScheduleSnapshotRow {
  id: number;
  mortgage_id: number;
  generated_at: string;
  trigger_event: string;
  trigger_payment_id: number | null;
  schedule_json: string;
  projected_payoff_date: string;
  projected_months: number;
  monthly_topup: number;
  user_a_final_equity_pct: number;
  user_b_final_equity_pct: number;
}
