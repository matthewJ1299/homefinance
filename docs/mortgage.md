# Mortgage

## Interest rate changes

HomeFinance supports **scheduled interest rate changes** during the loan (typical for variable / prime-linked mortgages in South Africa).

### Data model

- **`mortgage_configs.annual_interest_rate`** — starting rate from loan setup (applies from loan month 1 unless overridden).
- **`mortgage_rate_periods`** — optional rows: `effective_from_month` + `annual_interest_rate`. From that loan month onward, the new rate applies until the next period.

Loan months are numbered from `start_date` (month 1 = first payment month).

### Calculation behaviour

1. **Interest on actual payments** — `allocateMonthPrincipalInterest()` uses the rate effective for that calendar month (after prior principal reduces the balance).
2. **Projected schedule** — `simulateSchedule()` / `projectScheduleFromBalance()` recalculate the **minimum monthly payment** whenever the effective rate changes, using:
   - opening balance for that month
   - remaining original term (`loan_term_months - month + 1`)
   - new monthly rate
3. **Summary card** — shows the **next** payment’s minimum, rate %, and per-user split (including top-up for equity convergence).

### UI

On `/mortgage`, open **Interest rate changes** to add rows such as “from loan month 6 → 11%”. Saving recalculates the projected schedule and upcoming payment amounts.

### Related

- Unit tests: `src/tests/mortgage-rate-periods.test.ts`, `src/tests/transaction-drift.test.ts`
- Integration: `src/__tests__/integration/mortgage-interest-recalc.integration.test.ts`
- Migration: `drizzle/0026_mortgage_rate_periods_pg.sql`
