import { all, get, run, lastInsertId } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
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
  is_extra_payment: number | boolean;
  note: string | null;
  created_at: string;
}

interface RatePeriodRow {
  id: number;
  mortgage_id: number;
  effective_from_month: number;
  annual_interest_rate: number;
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
    targetEquityUserAPct: r.target_equity_user_a_pct,
  };
}

export class MortgageRepository implements IMortgageRepository {
  async getActiveConfig() {
    const hid = requireHouseholdId();
    const row = await get<ConfigRow>(
      "SELECT id, property_value, loan_amount, annual_interest_rate, loan_term_months, start_date, target_equity_user_a_pct FROM mortgage_configs WHERE household_id = ? AND is_active = true LIMIT 1",
      [hid]
    );
    return row ? toConfigRow(row) : null;
  }

  async getUserConfigs(mortgageId: number) {
    const hid = requireHouseholdId();
    const rows = await all<UserConfigRow>(
      `SELECT muc.user_id, u.name, muc.initial_deposit, muc.base_split_pct, muc.monthly_cap
       FROM mortgage_user_configs muc
       INNER JOIN users u ON muc.user_id = u.id
       INNER JOIN mortgage_configs mc ON muc.mortgage_id = mc.id
       WHERE muc.mortgage_id = ? AND muc.household_id = ? AND mc.household_id = ?`,
      [mortgageId, hid, hid]
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
    const hid = requireHouseholdId();
    const existing = await this.getActiveConfig();
    if (existing) {
      await run(
        `UPDATE mortgage_configs SET property_value = ?, loan_amount = ?, annual_interest_rate = ?, loan_term_months = ?, start_date = ?, target_equity_user_a_pct = ? WHERE id = ? AND household_id = ?`,
        [
          data.propertyValue,
          data.loanAmount,
          data.annualInterestRate,
          data.loanTermMonths,
          data.startDate,
          data.targetEquityUserAPct ?? 0.5,
          existing.id,
          hid,
        ]
      );
      return { ...existing, ...data };
    }
    await run(
      `INSERT INTO mortgage_configs (property_value, loan_amount, annual_interest_rate, loan_term_months, start_date, target_equity_user_a_pct, household_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.propertyValue,
        data.loanAmount,
        data.annualInterestRate,
        data.loanTermMonths,
        data.startDate,
        data.targetEquityUserAPct ?? 0.5,
        hid,
      ]
    );
    const row = await get<ConfigRow>(
      "SELECT id, property_value, loan_amount, annual_interest_rate, loan_term_months, start_date, target_equity_user_a_pct FROM mortgage_configs WHERE household_id = ? ORDER BY id DESC LIMIT 1",
      [hid]
    );
    if (!row) {
      throw new Error("Mortgage config INSERT succeeded but no config row found");
    }
    return toConfigRow(row);
  }

  async upsertUserConfig(
    mortgageId: number,
    userId: number,
    data: { initialDeposit: number; baseSplitPct: number; monthlyCap?: number | null }
  ) {
    const hid = requireHouseholdId();
    await run(
      `INSERT INTO mortgage_user_configs (mortgage_id, user_id, initial_deposit, base_split_pct, monthly_cap, household_id) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (mortgage_id, user_id) DO UPDATE SET initial_deposit = excluded.initial_deposit, base_split_pct = excluded.base_split_pct, monthly_cap = excluded.monthly_cap`,
      [mortgageId, userId, data.initialDeposit, data.baseSplitPct, data.monthlyCap ?? null, hid]
    );
  }

  async getPayments(mortgageId: number) {
    const hid = requireHouseholdId();
    const rows = await all<PaymentRow>(
      "SELECT id, mortgage_id, user_id, payment_date, month_number, amount, principal_portion, interest_portion, is_extra_payment, note, created_at FROM mortgage_payments WHERE mortgage_id = ? AND household_id = ? ORDER BY month_number",
      [mortgageId, hid]
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
      isExtraPayment: r.is_extra_payment === true || r.is_extra_payment === 1,
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
    const hid = requireHouseholdId();
    await run(
      `INSERT INTO mortgage_payments (mortgage_id, user_id, payment_date, month_number, amount, principal_portion, interest_portion, is_extra_payment, note, household_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.mortgageId,
        data.userId,
        data.paymentDate,
        data.monthNumber,
        data.amount,
        data.principalPortion,
        data.interestPortion,
        data.isExtraPayment,
        data.note ?? null,
        hid,
      ]
    );
    return await lastInsertId();
  }

  async updatePaymentPrincipalInterest(
    paymentId: number,
    principalPortion: number,
    interestPortion: number
  ) {
    const hid = requireHouseholdId();
    await run(
      "UPDATE mortgage_payments SET principal_portion = ?, interest_portion = ? WHERE id = ? AND household_id = ?",
      [principalPortion, interestPortion, paymentId, hid]
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
    const hid = requireHouseholdId();
    await run(
      `INSERT INTO mortgage_schedule_snapshots (mortgage_id, trigger_event, trigger_payment_id, schedule_json, projected_payoff_date, projected_months, monthly_topup, user_a_final_equity_pct, user_b_final_equity_pct, household_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        hid,
      ]
    );
  }

  async getRatePeriods(mortgageId: number) {
    const hid = requireHouseholdId();
    const rows = await all<RatePeriodRow>(
      `SELECT rp.id, rp.mortgage_id, rp.effective_from_month, rp.annual_interest_rate, rp.created_at
       FROM mortgage_rate_periods rp
       INNER JOIN mortgage_configs mc ON mc.id = rp.mortgage_id
       WHERE rp.mortgage_id = ? AND mc.household_id = ?
       ORDER BY rp.effective_from_month`,
      [mortgageId, hid]
    );
    return rows.map((row) => ({
      id: row.id,
      mortgageId: row.mortgage_id,
      effectiveFromMonth: row.effective_from_month,
      annualInterestRate: row.annual_interest_rate,
      createdAt: row.created_at,
    }));
  }

  async replaceRatePeriods(
    mortgageId: number,
    periods: Array<{ effectiveFromMonth: number; annualInterestRate: number }>
  ) {
    const hid = requireHouseholdId();
    // Guard: only touch rate periods for a mortgage owned by this household.
    const owned = await get<{ id: number }>(
      "SELECT id FROM mortgage_configs WHERE id = ? AND household_id = ? LIMIT 1",
      [mortgageId, hid]
    );
    if (!owned) {
      throw new Error("Mortgage not found for this household");
    }
    await run("DELETE FROM mortgage_rate_periods WHERE mortgage_id = ?", [mortgageId]);
    for (const period of periods) {
      await run(
        `INSERT INTO mortgage_rate_periods (mortgage_id, effective_from_month, annual_interest_rate) VALUES (?, ?, ?)`,
        [mortgageId, period.effectiveFromMonth, period.annualInterestRate]
      );
    }
  }
}
