import { subMonths, format } from "date-fns";
import { lastInsertId, run } from "../index";
import type { SeedContext } from "./types";

const MORTGAGE_PAYMENT_COUNT = 15;

export async function seedMortgage(ctx: SeedContext): Promise<void> {
  const { householdId, mattId, sydneyId } = ctx;
  const startDate = format(subMonths(new Date(), MORTGAGE_PAYMENT_COUNT), "yyyy-MM-dd");
  const propertyValue = 2_500_000_00;
  const loanAmount = 2_000_000_00;
  const annualRate = 0.1125;
  const loanTermMonths = 240;
  const monthlyPayment = 1_750_000;

  await run(
    `INSERT INTO mortgage_configs (property_value, loan_amount, annual_interest_rate, loan_term_months, start_date,
      target_equity_user_a_pct, is_active, household_id)
     VALUES (?, ?, ?, ?, ?, 0.55, true, ?)`,
    [propertyValue, loanAmount, annualRate, loanTermMonths, startDate, householdId]
  );
  const mortgageId = await lastInsertId();

  await run(
    "INSERT INTO mortgage_user_configs (mortgage_id, user_id, initial_deposit, base_split_pct, monthly_cap, household_id) VALUES (?, ?, ?, ?, NULL, ?)",
    [mortgageId, mattId, 550_000_00, 0.55, householdId]
  );
  await run(
    "INSERT INTO mortgage_user_configs (mortgage_id, user_id, initial_deposit, base_split_pct, monthly_cap, household_id) VALUES (?, ?, ?, ?, NULL, ?)",
    [mortgageId, sydneyId, 450_000_00, 0.45, householdId]
  );

  await run(
    "INSERT INTO mortgage_rate_periods (mortgage_id, effective_from_month, annual_interest_rate) VALUES (?, 1, ?)",
    [mortgageId, annualRate]
  );

  for (let monthNum = 1; monthNum <= MORTGAGE_PAYMENT_COUNT; monthNum++) {
    const paymentDate = format(
      subMonths(new Date(), MORTGAGE_PAYMENT_COUNT - monthNum),
      "yyyy-MM-dd"
    );
    const interestPortion = Math.round((monthlyPayment * (16 - monthNum)) / 15);
    const principalPortion = monthlyPayment - interestPortion;
    const payerId = monthNum % 2 === 0 ? sydneyId : mattId;

    await run(
      `INSERT INTO mortgage_payments (mortgage_id, user_id, payment_date, month_number, amount, principal_portion,
        interest_portion, is_extra_payment, note, household_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, false, NULL, ?)`,
      [
        mortgageId,
        payerId,
        paymentDate,
        monthNum,
        monthlyPayment,
        principalPortion,
        interestPortion,
        householdId,
      ]
    );
  }

  console.log(
    `Created shared mortgage with 2 user configs and ${MORTGAGE_PAYMENT_COUNT} alternating payments.`
  );
}
