import { all, get, run, lastInsertId } from "@/lib/db";
import type { IMortgageRepository } from "../interfaces/mortgage.repository";

interface ConfigRow {
  id: number;
  property_value: number;
  loan_amount: number;
  annual_interest_rate: number;
  loan_term_months: number;
  start_date: string;
  target_equity_user_a_pct: number | null;
}

interface UserConfigRow {
  user_id: number;
  name: string;
  initial_deposit: number;
  base_split_pct: number;
  monthly_cap: number | null;
}

interface PaymentRow {
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

function toConfigRow(r: ConfigRow) {
  return {
    id: r.id,
    propertyValue: r.property_value,
    loanAmount: r.loan_amount,
    annualInterestRate: r.annual_interest_rate,
    loanTermMonths: r.loan_term_months,
    startDate: r.start_date,
    targetEquityUserAPct: r.target_equity_user_a_pct ?? 0.5,
  };
}

export class MortgageRepository implements IMortgageRepository {
  async getActiveConfig() {
    const row = await get<ConfigRow>(
      "SELECT id, property_value, loan_amount, annual_interest_rate, loan_term_months, start_date, target_equity_user_a_pct FROM mortgage_configs WHERE is_active = 1 LIMIT 1"
    );
    return row ? toConfigRow(row) : null;
  }

  async getUserConfigs(mortgageId: number) {
    const rows = await all<UserConfigRow>(
      `SELECT muc.user_id, u.name, muc.initial_deposit, muc.base_split_pct, muc.monthly_cap
       FROM mortgage_user_configs muc INNER JOIN users u ON muc.user_id = u.id WHERE muc.mortgage_id = ?`,
      [mortgageId]
    );
    return rows.map((r) => ({
      userId: r.user_id,
      userName: r.name,
      initialDeposit: r.initial_deposit,
      baseSplitPct: r.base_split_pct,
      monthlyCap: r.monthly_cap,
    }));
  }

  async upsertConfig(data: {
    propertyValue: number;
    loanAmount: number;
    annualInterestRate: number;
    loanTermMonths: number;
    startDate: string;
    targetEquityUserAPct?: number | null;
  }) {
    const existing = await this.getActiveConfig();
    if (existing) {
      await run(
        `UPDATE mortgage_configs SET property_value = ?, loan_amount = ?, annual_interest_rate = ?, loan_term_months = ?, start_date = ?, target_equity_user_a_pct = ? WHERE id = ?`,
        [
          data.propertyValue,
          data.loanAmount,
          data.annualInterestRate,
          data.loanTermMonths,
          data.startDate,
          data.targetEquityUserAPct ?? 0.5,
          existing.id,
        ]
      );
      return { ...existing, ...data };
    }
    await run(
      `INSERT INTO mortgage_configs (property_value, loan_amount, annual_interest_rate, loan_term_months, start_date, target_equity_user_a_pct) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.propertyValue,
        data.loanAmount,
        data.annualInterestRate,
        data.loanTermMonths,
        data.startDate,
        data.targetEquityUserAPct ?? 0.5,
      ]
    );
    const id = await lastInsertId();
    const row = (await get<ConfigRow>(
      "SELECT id, property_value, loan_amount, annual_interest_rate, loan_term_months, start_date, target_equity_user_a_pct FROM mortgage_configs WHERE id = ?",
      [id]
    ))!;
    return toConfigRow(row);
  }

  async upsertUserConfig(
    mortgageId: number,
    userId: number,
    data: { initialDeposit: number; baseSplitPct: number; monthlyCap?: number | null }
  ) {
    await run(
      `INSERT INTO mortgage_user_configs (mortgage_id, user_id, initial_deposit, base_split_pct, monthly_cap) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (mortgage_id, user_id) DO UPDATE SET initial_deposit = excluded.initial_deposit, base_split_pct = excluded.base_split_pct, monthly_cap = excluded.monthly_cap`,
      [mortgageId, userId, data.initialDeposit, data.baseSplitPct, data.monthlyCap ?? null]
    );
  }

  async getPayments(mortgageId: number) {
    const rows = await all<PaymentRow>(
      "SELECT id, mortgage_id, user_id, payment_date, month_number, amount, principal_portion, interest_portion, is_extra_payment, note, created_at FROM mortgage_payments WHERE mortgage_id = ? ORDER BY month_number",
      [mortgageId]
    );
    return rows.map((r) => ({
      id: r.id,
      mortgageId: r.mortgage_id,
      userId: r.user_id,
      paymentDate: r.payment_date,
      monthNumber: r.month_number,
      amount: r.amount,
      principalPortion: r.principal_portion,
      interestPortion: r.interest_portion,
      isExtraPayment: r.is_extra_payment === 1,
      note: r.note,
      createdAt: r.created_at,
    }));
  }

  async insertPayment(data: {
    mortgageId: number;
    userId: number;
    paymentDate: string;
    monthNumber: number;
    amount: number;
    principalPortion: number;
    interestPortion: number;
    isExtraPayment: boolean;
    note?: string | null;
  }) {
    await run(
      `INSERT INTO mortgage_payments (mortgage_id, user_id, payment_date, month_number, amount, principal_portion, interest_portion, is_extra_payment, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.mortgageId,
        data.userId,
        data.paymentDate,
        data.monthNumber,
        data.amount,
        data.principalPortion,
        data.interestPortion,
        data.isExtraPayment ? 1 : 0,
        data.note ?? null,
      ]
    );
    return await lastInsertId();
  }

  async updatePaymentPrincipalInterest(
    paymentId: number,
    principalPortion: number,
    interestPortion: number
  ) {
    await run(
      "UPDATE mortgage_payments SET principal_portion = ?, interest_portion = ? WHERE id = ?",
      [principalPortion, interestPortion, paymentId]
    );
  }

  async saveSnapshot(data: {
    mortgageId: number;
    triggerEvent: string;
    triggerPaymentId?: number | null;
    scheduleJson: string;
    projectedPayoffDate: string;
    projectedMonths: number;
    monthlyTopup: number;
    userAFinalEquityPct: number;
    userBFinalEquityPct: number;
  }) {
    await run(
      `INSERT INTO mortgage_schedule_snapshots (mortgage_id, trigger_event, trigger_payment_id, schedule_json, projected_payoff_date, projected_months, monthly_topup, user_a_final_equity_pct, user_b_final_equity_pct) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.mortgageId,
        data.triggerEvent,
        data.triggerPaymentId ?? null,
        data.scheduleJson,
        data.projectedPayoffDate,
        data.projectedMonths,
        data.monthlyTopup,
        data.userAFinalEquityPct,
        data.userBFinalEquityPct,
      ]
    );
  }
}
